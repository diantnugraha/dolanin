import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { periodBounds } from "@/lib/stats";
import {
  getDailySeries, getKpis, getPesanByCity, getTopListings, getZeroClickListings,
} from "@/lib/stats";
import { resetDb, seedBasic } from "./setup";

const NOW = new Date("2026-10-26T12:00:00+07:00");
const F = { days: 7 as const, now: NOW };

async function ev(
  l: { id: string; cityId: string; type: "HOTEL" | "PENGINAPAN" | "VILLA" },
  kind: "VIEW" | "PESAN" | "WA",
  at: string,
  n = 1,
) {
  await db.event.createMany({
    data: Array.from({ length: n }, () => ({
      listingId: l.id, kind, cityId: l.cityId, type: l.type, createdAt: new Date(at),
    })),
  });
}

beforeEach(async () => {
  await resetDb();
  await seedBasic();
});

describe("stats", () => {
  it("empty DB: zeros, null delta/ratio, no NaN", async () => {
    const k = await getKpis(F);
    expect(k.pesan).toEqual({ value: 0, delta: null });
    expect(k.wa).toEqual({ value: 0, delta: null });
    expect(k.views).toEqual({ value: 0, delta: null });
    expect(k.ratio).toBeNull();
    const s = await getDailySeries(F);
    expect(s).toHaveLength(7);
    expect(s.every((d) => d.pesan === 0 && d.wa === 0)).toBe(true);
    expect(s[6].date).toBe("2026-10-26");
    expect(s[0].date).toBe("2026-10-20");
  });

  it("buckets by WIB day (00:30 WIB belongs to that WIB date)", async () => {
    const l = await db.listing.findFirstOrThrow();
    await ev(l, "PESAN", "2026-10-26T00:30:00+07:00");
    await ev(l, "WA", "2026-10-25T23:30:00+07:00");
    const s = await getDailySeries(F);
    expect(s.find((d) => d.date === "2026-10-26")).toMatchObject({ pesan: 1, wa: 0 });
    expect(s.find((d) => d.date === "2026-10-25")).toMatchObject({ pesan: 0, wa: 1 });
  });

  it("kpis with delta and ratio", async () => {
    const l = await db.listing.findFirstOrThrow();
    await ev(l, "PESAN", "2026-10-25T10:00:00+07:00", 3);
    await ev(l, "PESAN", "2026-10-15T10:00:00+07:00", 2); // previous period
    await ev(l, "VIEW", "2026-10-25T10:00:00+07:00", 10);
    const k = await getKpis(F);
    expect(k.pesan.value).toBe(3);
    expect(k.pesan.delta).toBeCloseTo(0.5);
    expect(k.views.delta).toBeNull();
    expect(k.ratio).toBeCloseTo(0.3);
  });

  it("half-open windows: event at `from` is current only, at `prevFrom` is previous", async () => {
    const l = await db.listing.findFirstOrThrow();
    const b = periodBounds(7, NOW);
    await ev(l, "PESAN", b.from.toISOString());
    let k = await getKpis(F);
    expect(k.pesan.value).toBe(1);
    expect(k.pesan.delta).toBeNull(); // prev = 0
    await resetDb();
    await seedBasic();
    const l2 = await db.listing.findFirstOrThrow();
    await ev(l2, "PESAN", b.prevFrom.toISOString());
    await ev(l2, "PESAN", b.from.toISOString());
    k = await getKpis(F);
    expect(k.pesan.value).toBe(1);
    expect(k.pesan.delta).toBe(0); // prev = 1 (only the prevFrom event)
    const s = await getDailySeries(F);
    expect(s[0]).toMatchObject({ date: "2026-10-20", pesan: 1 });
  });

  it("type filter (enum cast)", async () => {
    const hotel = await db.listing.findFirstOrThrow({ where: { type: "HOTEL" } });
    const villa = await db.listing.findFirstOrThrow({ where: { type: "VILLA" } });
    const at = "2026-10-25T10:00:00+07:00";
    await ev(hotel, "PESAN", at, 2);
    await ev(villa, "PESAN", at, 4);
    expect((await getKpis({ ...F, type: "VILLA" })).pesan.value).toBe(4);
    const s = await getDailySeries({ ...F, type: "HOTEL" });
    expect(s.reduce((x, d) => x + d.pesan, 0)).toBe(2);
  });

  it("cityId filter counts only that city", async () => {
    const [a, b] = await db.listing.findMany({ distinct: ["cityId"], take: 2 });
    await ev(a, "PESAN", "2026-10-25T10:00:00+07:00", 2);
    await ev(b, "PESAN", "2026-10-25T10:00:00+07:00", 5);
    const k = await getKpis({ ...F, cityId: a.cityId });
    expect(k.pesan.value).toBe(2);
    const s = await getDailySeries({ ...F, cityId: b.cityId });
    expect(s.reduce((x, d) => x + d.pesan, 0)).toBe(5);
  });

  it("getPesanByCity: top 5 + other", async () => {
    const cities = await db.city.findMany({ orderBy: { sortOrder: "asc" } });
    const extra = [];
    for (let i = 0; i < 2; i++) {
      extra.push(await db.city.create({ data: { name: `X${i}`, slug: `x${i}`, code: `X${i}`, sortOrder: 90 + i } }));
    }
    const all = [...cities, ...extra];
    expect(all.length).toBe(7);
    const first = await db.listing.findFirstOrThrow();
    const at = "2026-10-25T10:00:00+07:00";
    for (const [i, c] of all.entries()) {
      await db.event.createMany({
        data: Array.from({ length: 10 - i }, () => ({
          listingId: first.id, kind: "PESAN" as const, cityId: c.id, type: "HOTEL" as const, createdAt: new Date(at),
        })),
      });
    }
    const r = await getPesanByCity(F);
    expect(r).toHaveLength(6);
    expect(r[0]).toEqual({ name: all[0].name, count: 10 });
    expect(r[5]).toEqual({ name: "Kota lainnya", count: 5 + 4, other: true });
  });

  it("top listings ordered by pesan with ratio and cover", async () => {
    const [a, b] = await db.listing.findMany({ take: 2, orderBy: { slug: "asc" } });
    const at = "2026-10-25T10:00:00+07:00";
    await ev(a, "PESAN", at, 1);
    await ev(a, "VIEW", at, 4);
    await ev(b, "PESAN", at, 3);
    await ev(b, "WA", at, 1);
    const r = await getTopListings(F);
    expect(r[0]).toMatchObject({ id: b.id, pesan: 3, wa: 1, views: 0, ratio: null });
    expect(r[1]).toMatchObject({ id: a.id, pesan: 1, views: 4, ratio: 0.25 });
    expect(r[0].cover).not.toBeUndefined();
  });

  it("zero-click excludes drafts and listings with a WA click", async () => {
    const ls = await db.listing.findMany({ orderBy: { slug: "asc" } });
    const [draft, withWa, plain] = ls;
    await db.listing.update({ where: { id: draft.id }, data: { published: false } });
    const at = "2026-10-25T10:00:00+07:00";
    await ev(withWa, "WA", at);
    await ev(plain, "VIEW", at, 9);
    const r = await getZeroClickListings(F, 100);
    const ids = r.map((x) => x.id);
    expect(ids).not.toContain(draft.id);
    expect(ids).not.toContain(withWa.id);
    expect(r[0]).toMatchObject({ id: plain.id, views: 9 });
  });
});
