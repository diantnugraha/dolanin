import { execSync } from "node:child_process";
import { loadEnvFile } from "node:process";
import { Client } from "pg";

// Equivalent of `prisma migrate reset --force`, done by hand: Prisma 7 refuses to run
// that command non-interactively under an AI agent, and has no --skip-seed anyway.
export default async function setup() {
  loadEnvFile(".env.test");
  const url = process.env.DATABASE_URL;
  if (!url || !/_test(\?|$)/.test(url)) throw new Error("Refusing to reset a non-test database");

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  } finally {
    await client.end();
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
