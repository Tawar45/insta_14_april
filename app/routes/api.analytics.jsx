/**
 * api.analytics.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Storefront analytics endpoint to track feed impressions (views) and shoppable
 * product pin clicks.
 *
 * Supports both JSON POST / FormData from the storefront Theme Extension
 * and App Proxy forwarding.
 */

import prisma from "../db.server.js";

// Set CORS headers so storefront fetch requests are accepted
function corsResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function sanitizeShop(rawShop) {
  if (!rawShop) return "";
  let s = String(rawShop).trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").split("/")[0].split("?")[0];
  return s;
}

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = sanitizeShop(url.searchParams.get("shop"));
  const event = url.searchParams.get("event") || "view";

  if (!shop) {
    return corsResponse({ ok: false, error: "Missing shop" }, 400);
  }

  await recordEvent(shop, event);
  return corsResponse({ ok: true });
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return corsResponse({}, 204);
  }

  const url = new URL(request.url);
  let shop = url.searchParams.get("shop") || "";
  let event = url.searchParams.get("event") || "view";

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("form")) {
      const formData = await request.formData();
      if (formData.get("shop")) shop = formData.get("shop");
      if (formData.get("event")) event = formData.get("event");
    } else {
      const text = await request.text();
      if (text) {
        try {
          const body = JSON.parse(text);
          if (body.shop) shop = body.shop;
          if (body.event) event = body.event;
        } catch (_) {}
      }
    }
  } catch (_) {}

  shop = sanitizeShop(shop);

  if (!shop) {
    return corsResponse({ ok: false, error: "Missing shop parameter" }, 400);
  }

  await recordEvent(shop, event);
  return corsResponse({ ok: true });
};

async function recordEvent(rawShop, rawEvent) {
  try {
    const shop = sanitizeShop(rawShop);
    if (!shop) return;
    const event = String(rawEvent || "view").trim().toLowerCase();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const isClick = event === "click";

    await prisma.feedMetric.upsert({
      where: {
        shop_date: {
          shop,
          date: today,
        },
      },
      update: {
        views: isClick ? undefined : { increment: 1 },
        clicks: isClick ? { increment: 1 } : undefined,
      },
      create: {
        shop,
        date: today,
        views: isClick ? 0 : 1,
        clicks: isClick ? 1 : 0,
      },
    });
  } catch (err) {
    console.error("[api.analytics] Error recording event:", err.message);
  }
}
