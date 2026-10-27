import { defineConfig } from "@playwright/test";
import { loadEnvFile } from "node:process";

// Test env must win over .env: process env takes precedence over .env files in Next.
loadEnvFile(".env.test");

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: process.env as Record<string, string>,
  },
});
