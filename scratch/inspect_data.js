import { PrismaClient } from "@prisma/client";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const session = await prisma.session.findFirst({
    where: { shop: "skywaytrading.myshopify.com" }
  });
  if (!session) {
    console.error("No Shopify session found in database.");
    return;
  }

  const { shop, accessToken } = session;
  console.log(`Using shop: ${shop}`);

  // Fetch the metafield value from Shopify Admin GraphQL API
  const query = `{
    shop {
      metafield(namespace: "ai_instafeed", key: "insta_data") {
        value
      }
    }
  }`;

  try {
    const response = await axios.post(
      `https://${shop}/admin/api/2025-04/graphql.json`,
      { query },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const rawValue = response.data?.data?.shop?.metafield?.value;
    if (!rawValue) {
      console.log("No insta_data metafield found on the shop.");
      return;
    }

    const parsed = JSON.parse(rawValue);
    console.log(`Successfully fetched insta_data.`);
    console.log(`Profile username: @${parsed.username}`);
    console.log(`Total media items in cache: ${parsed.media?.data?.length || 0}`);

    const mediaList = parsed.media?.data || [];
    const mediaTypes = {};
    const carouselDetails = [];

    mediaList.forEach((item, idx) => {
      const type = item.media_type;
      mediaTypes[type] = (mediaTypes[type] || 0) + 1;
      if (type === "CAROUSEL_ALBUM") {
        carouselDetails.push({
          index: idx,
          id: item.id,
          hasChildren: !!item.children,
          childrenCount: item.children?.data?.length || 0,
          children: item.children,
        });
      }
    });

    console.log("Media types distribution:", mediaTypes);
    console.log("Carousel details (first 5):", carouselDetails.slice(0, 5));
  } catch (error) {
    console.error("Error fetching metafield:", error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
