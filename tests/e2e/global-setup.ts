import { execSync } from "node:child_process";
import { loadEnvFile } from "node:process";

export default function globalSetup() {
  loadEnvFile(".env.test");
  const url = process.env.DATABASE_URL;
  if (!url || !/_test(\?|$)/.test(url)) throw new Error("Refusing to reset a non-test database");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
  execSync("npx tsx tests/e2e/reset-and-seed.ts", { stdio: "inherit", env: process.env });
}
