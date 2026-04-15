import { authenticate } from "../shopify.server";
import axios from "axios";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ error: "Unauthorized: App Proxy session missing." }, { status: 401 });
  }

  try {
    const shopRes = await admin.graphql(`{
      shop {
        metafield(namespace: "ai_instafeed", key: "config") {
          value
        }
      }
    }`);
    const shopJson = await shopRes.json();
    const configRaw = shopJson.data?.shop?.metafield?.value;
    let config = null;
    if (configRaw) {
      config = JSON.parse(configRaw);
    }

    let instaData = null;

    if (config && config.instagramHandle) {
      const fbToken = process.env.FACEBOOK_ACCESS_TOKEN;
      if (fbToken) {
        let handle = config.instagramHandle.replace('@', '').split('?')[0].split('/').filter(Boolean).pop();
        
        // 1. Get linked pages exactly like dashboard
        const pagesRes = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
          params: { access_token: fbToken }
        });
        
        if (pagesRes.data.data && pagesRes.data.data.length > 0) {
          const pageId = pagesRes.data.data[0].id;
          const pageToken = pagesRes.data.data[0].access_token;
          
          // 2. Get IG Business Account
          const igRes = await axios.get(`https://graph.facebook.com/v21.0/${pageId}`, {
            params: { fields: 'instagram_business_account', access_token: pageToken }
          });
          
          const igBusinessId = igRes.data.instagram_business_account?.id;
          
          if (igBusinessId) {
            // 3. Business Discovery Request
            const mediaQuery = `media.limit(50){media_url,media_type,caption,timestamp,like_count,comments_count,thumbnail_url,permalink}`;
            const response = await axios.get(`https://graph.facebook.com/v21.0/${igBusinessId}`, {
              params: {
                fields: `business_discovery.fields(username,name,biography,profile_picture_url,followers_count,follows_count,media_count,${mediaQuery}).username(${handle})`,
                access_token: fbToken
              }
            });
            instaData = response.data.business_discovery;
          }
        }
      }
    }

    return Response.json({ config, instaData });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};
