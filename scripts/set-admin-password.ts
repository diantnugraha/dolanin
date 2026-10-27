// Pakai: npm run admin:password -- <username> <password>
import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../lib/password";

async function main() {
  try { loadEnvFile(".env"); } catch {}
  const [username, password] = process.argv.slice(2);
  if (!username || !password) throw new Error("Pakai: npm run admin:password -- <username> <password>");
  if (password.length < 10) throw new Error("Password minimal 10 karakter");
  const passwordHash = await hashPassword(password);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    await db.admin.upsert({
      where: { id: 1 },
      create: { id: 1, username, passwordHash },
      update: { username, passwordHash, failedCount: 0, lockedUntil: null, sessionVersion: { increment: 1 } },
    });
    console.log(`Admin "${username}" siap.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
