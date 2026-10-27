import { beforeAll, describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, readSessionToken, verifyPassword } from "@/lib/auth";

const DAY = 24 * 60 * 60 * 1000;

beforeAll(() => {
  process.env.SESSION_SECRET = "x".repeat(48);
});

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const h = await hashPassword("rahasia-banget-1");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("rahasia-banget-1", h)).toBe(true);
    expect(await verifyPassword("salah", h)).toBe(false);
  });
  it("salts: two hashes of the same password differ", async () => {
    expect(await hashPassword("sama")).not.toBe(await hashPassword("sama"));
  });
  it("rejects malformed stored values", async () => {
    expect(await verifyPassword("a", "bukan-hash")).toBe(false);
  });
});

describe("session token", () => {
  it("round-trips", () => {
    expect(readSessionToken(createSessionToken(3))).toEqual({ v: 3 });
  });
  it("rejects a tampered token", () => {
    const t = createSessionToken(1);
    const bad = t.slice(0, -1) + (t.endsWith("A") ? "B" : "A");
    expect(readSessionToken(bad)).toBeNull();
    expect(readSessionToken(undefined)).toBeNull();
  });
  it("expires after 30 days", () => {
    const now = Date.now();
    const t = createSessionToken(1, now);
    expect(readSessionToken(t, now + 29 * DAY)).toEqual({ v: 1 });
    expect(readSessionToken(t, now + 31 * DAY)).toBeNull();
  });
  it("fails closed without a usable secret", () => {
    const t = createSessionToken(1);
    process.env.SESSION_SECRET = "short";
    try {
      expect(() => createSessionToken(1)).toThrow();
      expect(readSessionToken(t)).toBeNull();
    } finally {
      process.env.SESSION_SECRET = "x".repeat(48);
    }
  });
});
