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
 */

import { authenticate } from "../shopify.server.js";
import { fetchShopInstaData, fetchShopConfig, checkProPlan } from "../instagramApi.server.js";
import { trackApiResponse, withRateLimit } from "../rateLimiter.server.js";

export const loader = async ({ request }) => {
  // ── 1. Authenticate as app-proxy ─────────────────────────────────────────
  const { admin, session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json(
      { error: "Unauthorized: App Proxy session missing." },
      { status: 401 }
    );
  }

  const shop = session.shop;

  try {
    // ── 2. Get Subscription Status ───────────────────────────────────────────
    const isPro = await checkProPlan(admin, shop);

    // ── 3. Fetch config (cached, 30 min) ────────────────────────────────────
    const config = await withRateLimit(shop, () => fetchShopConfig(admin, shop));
    trackApiResponse(shop, {});

    // ── 4. Return early if no config exists ──────────────────────────────────
    if (!config || !config.instagramHandle) {
      return Response.json({ config: null, instaData: null }, { status: 200 });
    }

    // ── 5. Enforce Restrictions for Starter Plan ─────────────────────────────
    if (!isPro) {
      if (config.postFeed) {
        config.postFeed.removeWatermark = false; // Force watermark
        config.postFeed.load = false;           // Force no infinite scroll
        if (config.postFeed.desktopColumns > 4) config.postFeed.desktopColumns = 4;
        if (config.postFeed.desktopLimit > 12)  config.postFeed.desktopLimit = 12;
        // Also limit hidden post IDs? Maybe keep for consistency.
      }
      if (config.stories) {
        config.stories.enable = false; // Stories are PRO only
      }
    }

    // ── 6. Retrieve Persisted Instagram data ──────────────────────────────
    const instaData = await withRateLimit(shop, () => fetchShopInstaData(admin, shop));
    trackApiResponse(shop, {});

    // ── 7. Return response ───────────────────────────────────────────────────
    return Response.json({ config, instaData }, { status: 200 });

  } catch (error) {
    console.error("[api.data] Fatal error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
};
