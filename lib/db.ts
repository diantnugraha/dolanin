import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForDb = globalThis as unknown as { db?: PrismaClient; dbUrl?: string };

// Dev keeps one client across hot reloads, but a DATABASE_URL changed in .env gets a fresh one:
// Next reloads .env without restarting, and a cached client would keep using the old database.
const url = process.env.DATABASE_URL;
const cached = globalForDb.db && globalForDb.dbUrl === url ? globalForDb.db : undefined;
if (globalForDb.db && !cached) void globalForDb.db.$disconnect();

export const db = cached ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

if (process.env.NODE_ENV !== "production") Object.assign(globalForDb, { db, dbUrl: url });
