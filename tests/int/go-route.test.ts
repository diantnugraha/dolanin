import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { recordEvent, resolveGo } from "@/lib/tracking";
import { POST } from "@/app/api/view/route";
import * as go from "@/app/go/[id]/[kind]/route";
import { resetDb, seedBasic } from "./setup";

const CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const BOT = "Googlebot/2.1";

const get = (slug: string) => db.listing.findFirstOrThrow({ where: { slug }, include: { city: true } });

beforeEach(async () => {
  await resetDb();
  await seedBasic();
});

type Ch = "AGODA" | "TRAVELOKA" | "TRIP" | "TIKET" | "BOOKING" | "WHATSAPP";
const url = async (listingId: string, channel: Ch) =>
  (await db.listingLink.findUniqueOrThrow({ where: { listingId_channel: { listingId, channel } } })).url;

describe("resolveGo", () => {
  it("channel slug: 302 to that link and records CLICK with channel, cityId and type", async () => {
    const l = await get("omah-tugu-inn");
    expect(await resolveGo(l.id, "traveloka", CHROME)).toEqual({ status: 302, location: await url(l.id, "TRAVELOKA") });
    const ev = await db.event.findMany();
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ kind: "CLICK", channel: "TRAVELOKA", listingId: l.id, cityId: l.cityId, type: l.type });
  });

  it("every seeded channel of a listing resolves to its own link", async () => {
    const l = await get("omah-tugu-inn");
    for (const [slug, ch] of [["agoda", "AGODA"], ["trip", "TRIP"], ["tiket", "TIKET"], ["booking", "BOOKING"], ["whatsapp", "WHATSAPP"]] as const) {
      expect(await resolveGo(l.id, slug, CHROME)).toEqual({ status: 302, location: await url(l.id, ch) });
    }
  });

  it("a channel the listing does not have -> 404, no event", async () => {
    const dago = await get("kamar-dago-atas"); // BOOKING only
    expect(await resolveGo(dago.id, "agoda", CHROME)).toEqual({ status: 404 });
    expect(await db.event.count()).toBe(0);
  });

  it("bot: still redirects but records nothing", async () => {
    const l = await get("omah-tugu-inn");
    expect(await resolveGo(l.id, "agoda", BOT)).toEqual({ status: 302, location: await url(l.id, "AGODA") });
    expect(await db.event.count()).toBe(0);
  });

  it("legacy pesan: first non-WhatsApp link, recorded under that channel", async () => {
    const l = await get("omah-tugu-inn");
    expect(await resolveGo(l.id, "pesan", CHROME)).toEqual({ status: 302, location: await url(l.id, "AGODA") });
    expect(await db.event.findFirst()).toMatchObject({ kind: "CLICK", channel: "AGODA" });
  });

  it("legacy pesan on a WhatsApp-only listing falls back to WhatsApp", async () => {
    const l = await get("omah-tugu-inn");
    await db.listingLink.deleteMany({ where: { listingId: l.id, channel: { not: "WHATSAPP" } } });
    expect(await resolveGo(l.id, "pesan", CHROME)).toEqual({ status: 302, location: await url(l.id, "WHATSAPP") });
    expect(await db.event.findFirst()).toMatchObject({ kind: "CLICK", channel: "WHATSAPP" });
  });

  it("legacy wa: the WhatsApp link", async () => {
    const l = await get("omah-tugu-inn");
    expect(await resolveGo(l.id, "wa", CHROME)).toEqual({ status: 302, location: await url(l.id, "WHATSAPP") });
  });

  it("legacy pesan/wa with no matching link -> 404", async () => {
    const dago = await get("kamar-dago-atas");
    expect(await resolveGo(dago.id, "wa", CHROME)).toEqual({ status: 404 });
    await db.listingLink.deleteMany({ where: { listingId: dago.id } });
    expect(await resolveGo(dago.id, "pesan", CHROME)).toEqual({ status: 404 });
    expect(await db.event.count()).toBe(0);
  });

  it("stored non-http link -> 404", async () => {
    const l = await get("omah-tugu-inn");
    await db.listingLink.update({ where: { listingId_channel: { listingId: l.id, channel: "AGODA" } }, data: { url: "javascript:alert(1)" } });
    expect(await resolveGo(l.id, "agoda", CHROME)).toEqual({ status: 404 });
  });

  it("draft, unknown channel, unknown id -> 404", async () => {
    const draft = await get("pondok-kaliurang");
    const l = await get("omah-tugu-inn");
    expect(await resolveGo(draft.id, "agoda", CHROME)).toEqual({ status: 404 });
    expect(await resolveGo(l.id, "expedia", CHROME)).toEqual({ status: 404 });
    expect(await resolveGo("tidak-ada", "agoda", CHROME)).toEqual({ status: 404 });
    expect(await db.event.count()).toBe(0);
  });
});

describe("/go route handler", () => {
  const call = (method: "GET" | "HEAD", id: string) =>
    (go as Record<string, unknown>)[method] as (r: Request, c: { params: Promise<{ id: string; kind: string }> }) => Promise<Response>;
  const req = (method: string, id: string) =>
    new Request(`http://x/go/${id}/agoda`, { method, headers: { "user-agent": CHROME } });

  it("GET: 302 to the channel link and counts the click", async () => {
    const l = await get("omah-tugu-inn");
    const res = await call("GET", l.id)(req("GET", l.id), { params: Promise.resolve({ id: l.id, kind: "agoda" }) });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(await url(l.id, "AGODA"));
    expect(await db.event.count()).toBe(1);
  });

  it("HEAD (curl -sI, link checkers): same 302 but no click is recorded", async () => {
    const l = await get("omah-tugu-inn");
    expect(typeof go.HEAD).toBe("function");
    const res = await call("HEAD", l.id)(req("HEAD", l.id), { params: Promise.resolve({ id: l.id, kind: "agoda" }) });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(await url(l.id, "AGODA"));
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await db.event.count()).toBe(0);
  });

  it("HEAD: unknown listing -> 404", async () => {
    const res = await call("HEAD", "tidak-ada")(req("HEAD", "tidak-ada"), { params: Promise.resolve({ id: "tidak-ada", kind: "agoda" }) });
    expect(res.status).toBe(404);
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
    expect(await resolveGo(l.id, "agoda", CHROME)).toEqual({ status: 302, location: await url(l.id, "AGODA") });
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
