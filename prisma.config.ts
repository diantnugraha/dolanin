import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Prisma 7 removed `directUrl`: the CLI (migrate) only reads `datasource.url`.
  // Use the direct (non-pooled) URL for migrations when set; the app runtime
  // (lib/db.ts) keeps using DATABASE_URL (pooled).
  datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL || "" },
});
