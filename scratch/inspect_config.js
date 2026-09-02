import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function check() {
  const session = await prisma.session.findFirst({
    where: { shop: "skywaytrading.myshopify.com" }
  });
  if (!session) {
    console.log("No session found");
    return;
  }
  const query = `{
    shop {
      id
      metafield(namespace: "ai_instafeed", key: "config") {
        id
        value
      }
    }
  }`;
  const res = await fetch(`https://${session.shop}/admin/api/2025-04/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": session.accessToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  console.log("Config:", json.data?.shop?.metafield?.value);
}

check().finally(() => prisma.$disconnect());
