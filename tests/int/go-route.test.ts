import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { recordEvent, resolveGo } from "@/lib/tracking";
import { POST } from "@/app/api/view/route";
import { resetDb, seedBasic } from "./setup";

const CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const BOT = "Googlebot/2.1";

const get = (slug: string) => db.listing.findFirstOrThrow({ where: { slug }, include: { city: true } });

beforeEach(async () => {
  await resetDb();
  await seedBasic();
});

describe("resolveGo", () => {
  it("pesan: 302 to affiliateUrl and records PESAN with cityId/type", async () => {
    const l = await get("omah-tugu-inn");
    expect(await resolveGo(l.id, "pesan", CHROME)).toEqual({ status: 302, location: l.affiliateUrl });
    const ev = await db.event.findMany();
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ kind: "PESAN", listingId: l.id, cityId: l.cityId, type: l.type });
  });

  it("bot: still redirects but records nothing", async () => {
    const l = await get("omah-tugu-inn");
    expect(await resolveGo(l.id, "pesan", BOT)).toEqual({ status: 302, location: l.affiliateUrl });
    expect(await db.event.count()).toBe(0);
  });

  it("wa: redirects to wa.me with encoded text containing detail url", async () => {
    const l = await get("omah-tugu-inn");
    const r = await resolveGo(l.id, "wa", CHROME);
    expect(r.status).toBe(302);
    const loc = (r as { location: string }).location;
    expect(loc.startsWith("https://wa.me/62")).toBe(true);
    const text = decodeURIComponent(loc.split("?text=")[1]);
    expect(text).toContain(l.name);
    expect(text).toContain(`${process.env.NEXT_PUBLIC_SITE_URL}/${l.city.slug}/${l.slug}`);
    expect(await db.event.count({ where: { kind: "WA" } })).toBe(1);
  });

  it("wa: listing number wins over default", async () => {
    const l = await get("omah-tugu-inn");
    await db.listing.update({ where: { id: l.id }, data: { waNumber: "6281399999999" } });
    const r = await resolveGo(l.id, "wa", CHROME);
    expect((r as { location: string }).location.startsWith("https://wa.me/6281399999999?")).toBe(true);
  });

  it("wa: no listing number and no default -> 404, no event", async () => {
    const l = await get("omah-tugu-inn");
    await db.listing.update({ where: { id: l.id }, data: { waNumber: null } });
    await db.setting.update({ where: { id: 1 }, data: { waDefault: null } });
    expect(await resolveGo(l.id, "wa", CHROME)).toEqual({ status: 404 });
    expect(await db.event.count()).toBe(0);
  });

  it("pesan: non-http affiliateUrl -> 404", async () => {
    const l = await get("omah-tugu-inn");
    await db.listing.update({ where: { id: l.id }, data: { affiliateUrl: "javascript:alert(1)" } });
    expect(await resolveGo(l.id, "pesan", CHROME)).toEqual({ status: 404 });
  });

  it("draft, unknown kind, unknown id -> 404", async () => {
    const draft = await get("pondok-kaliurang");
    const l = await get("omah-tugu-inn");
    expect(await resolveGo(draft.id, "pesan", CHROME)).toEqual({ status: 404 });
    expect(await resolveGo(l.id, "lain", CHROME)).toEqual({ status: 404 });
    expect(await resolveGo("tidak-ada", "pesan", CHROME)).toEqual({ status: 404 });
    expect(await db.event.count()).toBe(0);
  });
});

describe("recordEvent", () => {
  it("returns false for unknown and draft listings", async () => {
    const draft = await get("pondok-kaliurang");
    expect(await recordEvent("tidak-ada", "VIEW")).toBe(false);
    expect(await recordEvent(draft.id, "VIEW")).toBe(false);
    expect(await db.event.count()).toBe(0);
  });
  it("records VIEW for published", async () => {
    const l = await get("omah-tugu-inn");
    expect(await recordEvent(l.id, "VIEW")).toBe(true);
    expect(await db.event.count({ where: { kind: "VIEW" } })).toBe(1);
  });
});

describe("best-effort tracking", () => {
  it("resolveGo still redirects when recording throws", async () => {
    const l = await get("omah-tugu-inn");
    const spy = vi.spyOn(db.event, "create").mockRejectedValueOnce(new Error("db down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await resolveGo(l.id, "pesan", CHROME)).toEqual({ status: 302, location: l.affiliateUrl });
    spy.mockRestore();
    err.mockRestore();
  });
});

describe("POST /api/view", () => {
  const post = (body: string, ua = CHROME) =>
    POST(new Request("http://x/api/view", { method: "POST", body, headers: { "user-agent": ua } }));

  it("204 and records VIEW for a valid id", async () => {
    const l = await get("omah-tugu-inn");
    expect((await post(l.id)).status).toBe(204);
    expect(await db.event.count({ where: { kind: "VIEW" } })).toBe(1);
  });

  it("204 when recording throws", async () => {
    const l = await get("omah-tugu-inn");
    const spy = vi.spyOn(db.event, "create").mockRejectedValueOnce(new Error("db down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post(l.id)).status).toBe(204);
    spy.mockRestore();
    err.mockRestore();
  });

  it("204 for empty, oversized, bot and unknown id, recording nothing", async () => {
    const l = await get("omah-tugu-inn");
    expect((await post("")).status).toBe(204);
    expect((await post("x".repeat(500))).status).toBe(204);
    expect((await post(l.id, BOT)).status).toBe(204);
    expect((await post("tidak-ada")).status).toBe(204);
    expect(await db.event.count()).toBe(0);
  });
});
