import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  await authenticate.webhook(request);

  // Delete shop data from DB here

  return new Response("OK", { status: 200 });
};
