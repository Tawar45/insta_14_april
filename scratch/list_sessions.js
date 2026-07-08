import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.session.findMany();
  console.log("Sessions count:", sessions.length);
  sessions.forEach(s => {
    console.log(`Shop: ${s.shop}, Expires: ${s.expires}, AccessToken: ${s.accessToken ? s.accessToken.slice(0, 15) + "..." : "null"}`);
  });
  await prisma.$disconnect();
}

main();
