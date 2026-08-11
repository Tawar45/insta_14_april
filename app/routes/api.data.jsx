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
    // ── 2. Get Subscription Status ───────────────────────────────────────────
    const isPro = await checkProPlan(admin, shop);

    // ── 3. Fetch config (cached, 30 min) ────────────────────────────────────
    let config = await withRateLimit(shop, () => fetchShopConfig(admin, shop));
    trackApiResponse(shop, {});

    // ── 4. Fallback to default if no config exists ───────────────────────────
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
          gap: 16,
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
          promoDesc: "Get 10% off your first purchase! Use code WELCOME10 at checkout.",
          showLabels: true,
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
          activeRing: true,
          ringColor: "#6366f1",
          showNavigation: true,
          mediaTypeFilter: "all",
          sortBy: "latest",
        },
      };
    }

    // ── 5. Enforce Restrictions for Starter Plan ─────────────────────────────
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

    // ── 6. Retrieve Persisted Instagram data ──────────────────────────────
    let instaData = await withRateLimit(shop, () => fetchShopInstaData(admin, shop));
    trackApiResponse(shop, {});

    // ── 7. Auto-refresh stale Instagram data in the background ───────────────
    // Instagram CDN media_url values expire. If data is >6 hours old and we
    // have a configured handle, kick off a background refresh and re-save.
    if (instaData && config.instagramHandle) {
      const crawledAt = instaData._crawledAt ? new Date(instaData._crawledAt).getTime() : 0;
      const ageMs = Date.now() - crawledAt;

      const hasCarouselAlbums = instaData.media?.data?.some(item => item.media_type === "CAROUSEL_ALBUM");
      const hasChildrenField = instaData.media?.data?.some(item => item.children?.data?.length > 0);
      const needsUpgradeToChildren = hasCarouselAlbums && !hasChildrenField;

      if (ageMs > REFRESH_THRESHOLD_MS || needsUpgradeToChildren) {
        console.info(
          `[api.data] Instagram data needs refresh (age: ${Math.round(ageMs / 3600000)}h, needs children: ${needsUpgradeToChildren}) for ${shop}.`
        );

        if (needsUpgradeToChildren) {
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
                instaData = freshData;
                console.info(`[api.data] Synchronous upgrade/refresh complete for ${shop}.`);
              }
            }
          } catch (e) {
            console.warn(`[api.data] Synchronous refresh failed for ${shop}:`, e.message);
          }
        } else {

        // Fire-and-forget background refresh (do NOT await — we return immediately)
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

            // Bust the cache so next poll serves fresh data
            await invalidateResource(shop, "insta_data");
            console.info(`[api.data] Background refresh complete for ${shop}.`);
          } catch (e) {
            console.warn(`[api.data] Background refresh failed for ${shop}:`, e.message);
          }
        })();
      }
    }
  }

    // ── 8. If no instaData yet but handle is set, try a live fetch right now ─
    if (!instaData && config.instagramHandle) {
      try {
        instaData = await fetchAllInstagramMedia(config.instagramHandle, shop);
        if (instaData) {
          // Persist it so we don't have to re-fetch next time
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
                      value: JSON.stringify(instaData),
                    },
                  ],
                },
              }
            );
            await invalidateResource(shop, "insta_data");
          }
        }
      } catch (e) {
        console.warn(`[api.data] On-demand fetch failed for ${shop}:`, e.message);
      }
    }

    // ── 9. Return response with Edge / CDN Cache Headers ─────────────────────
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
