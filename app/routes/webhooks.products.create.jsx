/**
 * webhooks.products.create.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shopify webhook: products/create
 *
 * When a new product is created in the merchant's store:
 *   1. Verify the request via Shopify HMAC (handled by authenticate.webhook).
 *   2. Deduplicate: skip if this webhook ID was already processed.
 *   3. Invalidate the cached products list for this shop.
 *   4. Enqueue a background job to re-warm the products cache.
 */

import { authenticate } from "../shopify.server.js";
import db from "../db.server.js";
import { invalidateResource } from "../cache.server.js";
import { enqueueJob } from "../backgroundSync.server.js";

export const action = async ({ request }) => {
  // ── 1. HMAC verification + payload extraction ─────────────────────────────
  const { topic, shop, payload, webhookId } = await authenticate.webhook(request);

  console.info(`[Webhook] ${topic} received for ${shop} (id: ${webhookId})`);

  try {
    // ── 2. Deduplication via DB ───────────────────────────────────────────────
    if (webhookId) {
      const existing = await db.webhookEvent.findUnique({ where: { webhookId } });
      if (existing) {
        console.info(`[Webhook] Duplicate ${topic} (id: ${webhookId}) – skipping`);
        return new Response(null, { status: 200 });
      }
      // Record as processed
      await db.webhookEvent.create({
        data: { webhookId, topic, shop, processedAt: new Date() },
      });
    }

    // ── 3. Invalidate product cache for this shop ─────────────────────────────
    await invalidateResource(shop, "products");

    // ── 4. Background re-warm (fire-and-forget) ───────────────────────────────
    enqueueJob({
      id:   `invalidate:products:${shop}`,
      shop,
      type: "invalidateCache",
      data: { shop, resource: "products" },
    });

    console.info(`[Webhook] products/create → cache invalidated for ${shop}. Product ID: ${payload?.id}`);
  } catch (error) {
    console.error(`[Webhook Error] Failed processing ${topic} for ${shop}:`, error);
  }

  return new Response(null, { status: 200 });
};
