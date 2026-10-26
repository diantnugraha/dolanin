// Run through tsx (the generated Prisma client is ESM-only, Playwright's loader is CJS).
import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { seedData } from "../../prisma/seed";

loadEnvFile(".env.test");
const url = process.env.DATABASE_URL;
if (!url || !/_test(\?|$)/.test(url)) throw new Error("Refusing to reset a non-test database");

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    await db.$executeRawUnsafe(
      'TRUNCATE TABLE "Event", "Media", "Listing", "City", "Setting", "Admin" RESTART IDENTITY CASCADE',
    );
    await seedData(db);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
