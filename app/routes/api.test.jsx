import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  const themeRes = await admin.graphql(`{ themes(first: 1, roles: [MAIN]) { nodes { id } } }`);
  const themeJson = await themeRes.json();
  const themeId = themeJson.data?.themes?.nodes[0]?.id.split("/").pop();

  if (!themeId) return Response.json({ error: "No theme" });

  try {
    const res = await admin.rest.get({ path: `themes/${themeId}/assets.json`, query: { "asset[key]": "config/settings_data.json" } });
    const json = await res.json();
    return Response.json({ json });
  } catch (e) {
    return Response.json({ error: e.message });
  }
};
