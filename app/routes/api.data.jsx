/**
 * api.data.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * App-Proxy endpoint consumed by the storefront Theme Extension (instafeed-front.js).
 *
 * Response shape: { config: object|null, instaData: object|null }
 *
 * Performance notes
 * ─────────────────
 * • Config AND Instagram data are served from cache on every hit.
 * • If cache is cold the live data is fetched, stored, and returned.
 * • Instagram fetch uses stale-while-revalidate so the browser always gets
 *   a fast response even when the cache is refreshing in the background.
 * • Shopify API call costs are tracked via rateLimiter so we never exceed
 *   the bucket limit.
 * • If stored Instagram data is >6 hours old, we trigger a background refresh
 *   via fetchAllInstagramMedia and re-save to metafield automatically.
 */

import { authenticate, unauthenticated } from "../shopify.server.js";
import {
  fetchShopInstaData,
  fetchShopConfig,
  checkProPlan,
  fetchAllInstagramMedia,
} from "../instagramApi.server.js";
import { trackApiResponse, withRateLimit } from "../rateLimiter.server.js";
import { invalidateResource } from "../cache.server.js";

// ── How old (ms) instaData can be before we trigger a background refresh ──
const REFRESH_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours

export const loader = async ({ request }) => {
  // ── 1. Authenticate as app-proxy ─────────────────────────────────────────
  let { admin, session } = await authenticate.public.appProxy(request);

  if (!session) {
    // HMAC is valid but offline token is missing (expired token or DB reset).
    // Fall back to unauthenticated.admin using the shop param Shopify provides.
    const shopParam = new URL(request.url).searchParams.get("shop");
    if (!shopParam) {
      return Response.json({ error: "Unauthorized: No session." }, { status: 401 });
    }
    try {
      const fallback = await unauthenticated.admin(shopParam);
      admin = fallback.admin;
      session = fallback.session;
    } catch {
      return Response.json({ config: null, instaData: null }, { status: 200 });
    }
  }

  const shop = session.shop;

  try {
    // ── 2. Concurrent Fetch: Plan + Config + Instagram Data (cached) ────────
    const [isPro, rawConfig, rawInstaData] = await Promise.all([
      checkProPlan(admin, shop),
      withRateLimit(shop, () => fetchShopConfig(admin, shop)),
      withRateLimit(shop, () => fetchShopInstaData(admin, shop)),
    ]);
    trackApiResponse(shop, {});

    let config = rawConfig;
    let instaData = rawInstaData;

    // ── 3. Fallback to default if no config exists ───────────────────────────
    if (!config) {
      config = {
        instagramHandle: "",
        aiCommentModeration: false,
        appSetup: { mainExt: false, sectionExt: false },
        postFeed: {
          header: true,
          metrics: true,
          load: false,
          carousel: true,
          autoplay: true,
          heading: "SHOP OUR INSTAGRAM",
          subheading: "Tag us @account to get featured in our gallery!",
          typography: {
            heading: { size: 18, weight: "800", color: "#0f172a" },
            subheading: { size: 12, weight: "500", color: "#64748b" },
          },
          alignment: "center",
          desktopColumns: 4,
          mobileColumns: 2,
          desktopLimit: 8,
          mobileLimit: 4,
          gap: 8,
          aspectRatio: "auto",
          removeWatermark: false,
          showInstagramIcon: true,
          hiddenPostIds: [],
          mediaTypeFilter: "all",
          sortBy: "latest",
        },
        stories: {
          enable: true,
          promoEnable: true,
          promoLabel: "Get 10% Off",
          promoCode: "WELCOME10",
          promoDesc: "Take a screenshot of a product you wish to buy and tag @gpmbazaar and we will send you a 10% Off Discount Coupon Code!",
          showLabels: false,
          carousel: true,
          autoplay: true,
          alignment: "center",
          showHeader: true,
          heading: "SHOP OUR INSTAGRAM",
          subheading: "Tag us @account to get featured in our gallery!",
          typography: {
            heading: { size: 28, weight: "800", color: "#000" },
            subheading: { size: 14, weight: "400", color: "#666" },
          },
          animateImages: false,
          activeRing: false,
          pulseRing: false,
          openPopup: true,
          ringColor: "#6366f1",
          showNavigation: true,
          mediaTypeFilter: "all",
          sortBy: "latest",
        },
      };
    }

    // ── 4. Enforce Restrictions for Starter Plan ─────────────────────────────
    if (!isPro) {
      config.aiCommentModeration = false; // Force AI Sentiment Moderation off on Starter plan
      if (config.postFeed) {
        config.postFeed.removeWatermark = false; // Force watermark
        config.postFeed.load = false;           // Force no infinite scroll
        config.postFeed.sortBy = "latest";       // Force latest
        if (config.postFeed.desktopColumns > 4) config.postFeed.desktopColumns = 4;
        if (config.postFeed.desktopLimit > 12)  config.postFeed.desktopLimit = 12;
      }
      if (config.stories) {
        config.stories.sortBy = "latest";       // Force latest
      }
    }

    // ── 5. Auto-refresh stale Instagram data in the background (Non-blocking) ─
    if (instaData && config.instagramHandle) {
      const crawledAt = instaData._crawledAt ? new Date(instaData._crawledAt).getTime() : 0;
      const ageMs = Date.now() - crawledAt;

      const hasCarouselAlbums = instaData.media?.data?.some(item => item.media_type === "CAROUSEL_ALBUM");
      const hasChildrenField = instaData.media?.data?.some(item => item.children?.data?.length > 0);
      const needsUpgradeToChildren = hasCarouselAlbums && !hasChildrenField;

      if (ageMs > REFRESH_THRESHOLD_MS || needsUpgradeToChildren) {
        // Fire-and-forget background refresh (never blocks the customer response)
        (async () => {
          try {
            const freshData = await fetchAllInstagramMedia(config.instagramHandle, shop);
            if (!freshData) return;

            const shopRes = await admin.graphql(`{ shop { id } }`);
            const shopJson = await shopRes.json();
            const shopId = shopJson.data?.shop?.id;
            if (!shopId) return;

            await admin.graphql(
              `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                  userErrors { message }
                }
              }`,
              {
                variables: {
                  metafields: [
                    {
                      ownerId: shopId,
                      namespace: "ai_instafeed",
                      key: "insta_data",
                      type: "json",
                      value: JSON.stringify(freshData),
                    },
                  ],
                },
              }
            );

            // Bust cache so subsequent requests get fresh data
            await invalidateResource(shop, "insta_data");
            console.info(`[api.data] Background refresh complete for ${shop}.`);
          } catch (e) {
            console.warn(`[api.data] Background refresh failed for ${shop}:`, e.message);
          }
        })();
      }
    } else if (!instaData && config.instagramHandle) {
      // Background populate if no data exists yet
      (async () => {
        try {
          const freshData = await fetchAllInstagramMedia(config.instagramHandle, shop);
          if (freshData) {
            const shopRes = await admin.graphql(`{ shop { id } }`);
            const shopJson = await shopRes.json();
            const shopId = shopJson.data?.shop?.id;
            if (shopId) {
              await admin.graphql(
                `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
                  metafieldsSet(metafields: $metafields) {
                    userErrors { message }
                  }
                }`,
                {
                  variables: {
                    metafields: [
                      {
                        ownerId: shopId,
                        namespace: "ai_instafeed",
                        key: "insta_data",
                        type: "json",
                        value: JSON.stringify(freshData),
                      },
                    ],
                  },
                }
              );
              await invalidateResource(shop, "insta_data");
            }
          }
        } catch (e) {
          console.warn(`[api.data] Background initial fetch failed for ${shop}:`, e.message);
        }
      })();
    }

    // ── 6. Return response with Edge / CDN Cache Headers ─────────────────────
    return Response.json(
      { config, instaData },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );

  } catch (error) {
    console.error("[api.data] Fatal error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
};
