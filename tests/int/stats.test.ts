import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  getClicksByChannel, getClicksByCity, getDailySeries, getKpis, getTopListings, getZeroClickListings, periodBounds,
} from "@/lib/stats";
import type { BookingChannel } from "@/generated/prisma/client";
import { resetDb, seedBasic } from "./setup";

const NOW = new Date("2026-10-26T12:00:00+07:00");
const F = { days: 7 as const, now: NOW };
const AT = "2026-10-25T10:00:00+07:00";

async function ev(
  l: { id: string; cityId: string; type: "HOTEL" | "VILLA" },
  kind: "VIEW" | "CLICK",
  at: string,
  n = 1,
  channel: BookingChannel | null = kind === "CLICK" ? "AGODA" : null,
) {
  await db.event.createMany({
    data: Array.from({ length: n }, () => ({
      listingId: l.id, kind, channel, cityId: l.cityId, type: l.type, createdAt: new Date(at),
    })),
  });
}

beforeEach(async () => {
  await resetDb();
  await seedBasic();
});

describe("stats", () => {
  it("empty DB: zeros, null delta/ratio/top, no NaN", async () => {
    const k = await getKpis(F);
    expect(k.clicks).toEqual({ value: 0, delta: null });
    expect(k.views).toEqual({ value: 0, delta: null });
    expect(k.ratio).toBeNull();
    expect(k.top).toBeNull();
    expect(await getClicksByChannel(F)).toEqual([]);
    const s = await getDailySeries(F);
    expect(s).toHaveLength(7);
    expect(s.every((d) => d.clicks === 0)).toBe(true);
    expect(s[6].date).toBe("2026-10-26");
    expect(s[0].date).toBe("2026-10-20");
  });

  it("buckets by WIB day (00:30 WIB belongs to that WIB date)", async () => {
    const l = await db.listing.findFirstOrThrow();
    await ev(l, "CLICK", "2026-10-26T00:30:00+07:00");
    await ev(l, "CLICK", "2026-10-25T23:30:00+07:00", 2, "WHATSAPP");
    const s = await getDailySeries(F);
    expect(s.find((d) => d.date === "2026-10-26")).toEqual({ date: "2026-10-26", clicks: 1 });
    expect(s.find((d) => d.date === "2026-10-25")).toEqual({ date: "2026-10-25", clicks: 2 });
  });

  it("kpis: total clicks with delta, ratio, and the top channel", async () => {
    const l = await db.listing.findFirstOrThrow();
    await ev(l, "CLICK", AT, 6, "AGODA");
    await ev(l, "CLICK", AT, 3, "WHATSAPP");
    await ev(l, "CLICK", AT, 1, null); // legacy "Lainnya"
    await ev(l, "VIEW", AT, 20);
    await ev(l, "CLICK", "2026-10-15T10:00:00+07:00", 3, "AGODA"); // previous period
    const k = await getKpis(F);
    expect(k.clicks.value).toBe(10);
    expect(k.clicks.delta).toBeCloseTo(10 / 3 - 1);
    expect(k.views).toEqual({ value: 20, delta: null });
    expect(k.ratio).toBe(0.5);
    expect(k.top).toEqual({ channel: "AGODA", share: 0.6 });
  });

  it("clicks per channel: count order, Lainnya (null) last, shares of all clicks, zero channels omitted", async () => {
    const l = await db.listing.findFirstOrThrow();
    await ev(l, "CLICK", AT, 1, null);
    await ev(l, "CLICK", AT, 3, "WHATSAPP");
    await ev(l, "CLICK", AT, 6, "AGODA");
    await ev(l, "VIEW", AT, 50);
    expect(await getClicksByChannel(F)).toEqual([
      { channel: "AGODA", count: 6, share: 0.6 },
      { channel: "WHATSAPP", count: 3, share: 0.3 },
      { channel: null, count: 1, share: 0.1 },
    ]);
  });

  it("only legacy clicks: no top channel, Lainnya is 100%", async () => {
    const l = await db.listing.findFirstOrThrow();
    await ev(l, "CLICK", AT, 4, null);
    expect((await getKpis(F)).top).toBeNull();
    expect(await getClicksByChannel(F)).toEqual([{ channel: null, count: 4, share: 1 }]);
  });

  it("half-open windows: event at `from` is current only, at `prevFrom` is previous", async () => {
    const l = await db.listing.findFirstOrThrow();
    const b = periodBounds(7, NOW);
    await ev(l, "CLICK", b.from.toISOString());
    let k = await getKpis(F);
    expect(k.clicks.value).toBe(1);
    expect(k.clicks.delta).toBeNull(); // prev = 0
    await resetDb();
    await seedBasic();
    const l2 = await db.listing.findFirstOrThrow();
    await ev(l2, "CLICK", b.prevFrom.toISOString());
    await ev(l2, "CLICK", b.from.toISOString());
    k = await getKpis(F);
    expect(k.clicks.value).toBe(1);
    expect(k.clicks.delta).toBe(0); // prev = 1 (only the prevFrom event)
    const s = await getDailySeries(F);
    expect(s[0]).toEqual({ date: "2026-10-20", clicks: 1 });
  });

  it("type filter (enum cast)", async () => {
    const hotel = await db.listing.findFirstOrThrow({ where: { type: "HOTEL" } });
    const villa = await db.listing.findFirstOrThrow({ where: { type: "VILLA" } });
    await ev(hotel, "CLICK", AT, 2);
    await ev(villa, "CLICK", AT, 4, "TRAVELOKA");
    expect((await getKpis({ ...F, type: "VILLA" })).clicks.value).toBe(4);
    expect(await getClicksByChannel({ ...F, type: "VILLA" })).toEqual([{ channel: "TRAVELOKA", count: 4, share: 1 }]);
    const s = await getDailySeries({ ...F, type: "HOTEL" });
    expect(s.reduce((x, d) => x + d.clicks, 0)).toBe(2);
  });

  it("cityId filter counts only that city", async () => {
    const [a, b] = await db.listing.findMany({ distinct: ["cityId"], take: 2 });
    await ev(a, "CLICK", AT, 2);
    await ev(b, "CLICK", AT, 5);
    expect((await getKpis({ ...F, cityId: a.cityId })).clicks.value).toBe(2);
    const s = await getDailySeries({ ...F, cityId: b.cityId });
    expect(s.reduce((x, d) => x + d.clicks, 0)).toBe(5);
  });

  it("getClicksByCity: top 5 + other, all channels counted", async () => {
    const cities = await db.city.findMany({ orderBy: { sortOrder: "asc" } });
    const extra = [];
    for (let i = 0; i < 2; i++) {
      extra.push(await db.city.create({ data: { name: `X${i}`, slug: `x${i}`, code: `X${i}`, sortOrder: 90 + i } }));
    }
    const all = [...cities, ...extra];
    expect(all.length).toBe(7);
    const first = await db.listing.findFirstOrThrow();
    for (const [i, c] of all.entries()) {
      await db.event.createMany({
        data: Array.from({ length: 10 - i }, (_, j) => ({
          listingId: first.id, kind: "CLICK" as const, channel: j % 2 ? ("WHATSAPP" as const) : ("AGODA" as const),
          cityId: c.id, type: "HOTEL" as const, createdAt: new Date(AT),
        })),
      });
    }
    const r = await getClicksByCity(F);
    expect(r).toHaveLength(6);
    expect(r[0]).toEqual({ name: all[0].name, count: 10 });
    expect(r[5]).toEqual({ name: "Kota lainnya", count: 5 + 4, other: true });
  });

  it("top listings: ordered by clicks, top channel ignores legacy clicks, ratio and cover", async () => {
    const [a, b] = await db.listing.findMany({ take: 2, orderBy: { slug: "asc" } });
    await ev(a, "CLICK", AT, 1, "TRIP");
    await ev(a, "VIEW", AT, 4);
    await ev(b, "CLICK", AT, 1, "BOOKING");
    await ev(b, "CLICK", AT, 3, null);
    const r = await getTopListings(F);
    expect(r[0]).toMatchObject({ id: b.id, clicks: 4, views: 0, ratio: null, topChannel: "BOOKING" });
    expect(r[1]).toMatchObject({ id: a.id, clicks: 1, views: 4, ratio: 0.25, topChannel: "TRIP" });
    expect(r[0].cover).not.toBeUndefined();
  });

  it("zero-click excludes drafts and listings with any click", async () => {
    const ls = await db.listing.findMany({ orderBy: { slug: "asc" } });
    const [draft, clicked, plain] = ls;
    await db.listing.update({ where: { id: draft.id }, data: { published: false } });
    await ev(clicked, "CLICK", AT, 1, "WHATSAPP");
    await ev(plain, "VIEW", AT, 9);
    const r = await getZeroClickListings(F, 100);
    const ids = r.map((x) => x.id);
    expect(ids).not.toContain(draft.id);
    expect(ids).not.toContain(clicked.id);
    expect(r[0]).toMatchObject({ id: plain.id, views: 9 });
  });
});
