import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export { hashPassword, verifyPassword };

export const SESSION_COOKIE = "dolanin_admin";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const MIN_PASSWORD = 10;

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createSessionToken(version: number, now: number = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("SESSION_SECRET harus diisi, minimal 32 karakter");
  const payload = Buffer.from(JSON.stringify({ v: version, exp: now + SESSION_MS })).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function readSessionToken(token: string | undefined, now: number = Date.now()): { v: number } | null {
  const key = secret();
  if (!key || !token) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const want = Buffer.from(sign(payload, key));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const { v, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!Number.isInteger(v) || typeof exp !== "number" || exp <= now) return null;
    return { v };
  } catch {
    return null;
  }
}

// Hash dummy untuk menyamakan waktu respons saat username tidak dikenal.
const dummyHash = hashPassword("dolanin-dummy-password");

export async function login(username: string, password: string): Promise<"ok" | "invalid" | "locked"> {
  const admin = await db.admin.findUnique({ where: { username } });
  if (!admin) {
    await verifyPassword(password, await dummyHash);
    return "invalid";
  }
  const now = new Date();
  // Kunci yang sudah lewat dibersihkan secara kondisional (aman untuk request paralel).
  await db.admin.updateMany({
    where: { id: admin.id, lockedUntil: { lte: now } },
    data: { failedCount: 0, lockedUntil: null },
  });
  const current = await db.admin.findUniqueOrThrow({ where: { id: admin.id } });
  if (current.lockedUntil && current.lockedUntil > now) return "locked";

  if (!(await verifyPassword(password, admin.passwordHash))) {
    // Increment atomik: percobaan paralel tidak bisa menimpa hitungan satu sama lain.
    const u = await db.admin.update({ where: { id: admin.id }, data: { failedCount: { increment: 1 } } });
    if (u.failedCount >= MAX_FAILS) {
      await db.admin.update({ where: { id: admin.id }, data: { lockedUntil: new Date(now.getTime() + LOCK_MS) } });
    }
    return "invalid";
  }
  await db.admin.update({ where: { id: admin.id }, data: { failedCount: 0, lockedUntil: null } });
  return "ok";
}

export async function startSession(): Promise<void> {
  const admin = await db.admin.findFirstOrThrow();
  (await cookies()).set(SESSION_COOKIE, createSessionToken(admin.sessionVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function requireAdmin(): Promise<void> {
  const session = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (session) {
    const admin = await db.admin.findFirst({ select: { sessionVersion: true } });
    if (admin && admin.sessionVersion === session.v) return;
  }
  redirect("/admin/login");
}

export async function changePassword(current: string, next: string): Promise<"ok" | "wrong" | "weak"> {
  await requireAdmin();
  const admin = await db.admin.findFirstOrThrow();
  if (!(await verifyPassword(current, admin.passwordHash))) return "wrong";
  if (next.length < MIN_PASSWORD) return "weak";
  await db.admin.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 }, failedCount: 0, lockedUntil: null },
  });
  await startSession();
  return "ok";
}
