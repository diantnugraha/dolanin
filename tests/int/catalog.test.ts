import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  findCityByExactName, getCatalog, getCityBoard, getListingDetail,
} from "@/lib/catalog";
import type { CatalogParams } from "@/lib/listing";
import { resetDb, seedBasic } from "./setup";

const P: CatalogParams = { types: [], sort: "asc", page: 1 };

async function addListing(citySlug: string, slug: string, price: number, extra: object = {}) {
  const city = await db.city.findUniqueOrThrow({ where: { slug: citySlug } });
  return db.listing.create({
    data: {
      name: slug, slug, cityId: city.id, type: "HOTEL", area: "Pusat", price,
      description: "x", facilities: [], extraFacilities: [], affiliateUrl: "https://example.com/a",
      published: true, ...extra,
    },
  });
}

beforeEach(async () => {
  await resetDb();
  await seedBasic();
});

describe("getCityBoard", () => {
  it("omits cities without published listings", async () => {
    await db.city.create({ data: { name: "Kosong", slug: "kosong", code: "KS", sortOrder: 99 } });
    const board = await getCityBoard();
    expect(board.map((c) => c.slug)).not.toContain("kosong");
    expect(board.length).toBe(5);
  });

  it("minPrice ignores drafts", async () => {
    await addListing("yogyakarta", "draft-murah", 10000, { published: false });
    const yk = (await getCityBoard()).find((c) => c.slug === "yogyakarta")!;
    expect(yk.minPrice).toBe(95000);
    expect(yk.count).toBe(5);
  });

  it("filters by type", async () => {
    const slugs = (await getCityBoard("VILLA")).map((c) => c.slug).sort();
    expect(slugs).toEqual(["bali", "lombok", "yogyakarta"]);
  });
});

describe("getCatalog", () => {
  it("sorts asc and totals published", async () => {
    const r = await getCatalog({ citySlug: "yogyakarta" }, P);
    const prices = r.items.map((i) => i.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(r.total).toBe(5);
  });

  it("sorts desc", async () => {
    const r = await getCatalog({ citySlug: "yogyakarta" }, { ...P, sort: "desc" });
    expect(r.items[0].price).toBe(480000);
  });

  it("filters by type but typeCounts ignore it", async () => {
    const r = await getCatalog({ citySlug: "yogyakarta" }, { ...P, types: ["VILLA"] });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((i) => i.type === "VILLA")).toBe(true);
    expect(r.typeCounts.HOTEL).toBeGreaterThan(0);
  });

  it("typeCounts ignore the type filter and exclude drafts", async () => {
    const r = await getCatalog({ citySlug: "yogyakarta" }, { ...P, types: ["VILLA"] });
    expect(r.typeCounts).toEqual({ HOTEL: 4, VILLA: 1 });
  });

  it("typeCounts honour the price filter", async () => {
    const r = await getCatalog({ citySlug: "yogyakarta" }, { ...P, preset: "lt150" });
    expect(r.typeCounts).toEqual({ HOTEL: 1, VILLA: 0 });
  });

  it("typeCounts honour q", async () => {
    const r = await getCatalog({ q: "tugu" }, P);
    expect(r.typeCounts).toEqual({ HOTEL: 1, VILLA: 0 });
  });

  it("typeCounts on the promoOnly path", async () => {
    const r = await getCatalog({ promoOnly: true }, P);
    expect(r.typeCounts).toEqual({ HOTEL: 3, VILLA: 1 });
    const v = await getCatalog({ promoOnly: true }, { ...P, types: ["VILLA"] });
    expect(v.typeCounts).toEqual({ HOTEL: 3, VILLA: 1 });
    expect(v.total).toBe(1);
  });

  it("zero-fills typeCounts", async () => {
    const r = await getCatalog({ citySlug: "bali" }, P);
    expect(r.typeCounts).toEqual({ HOTEL: 0, VILLA: 1 });
  });

  it("applies price preset", async () => {
    const r = await getCatalog({}, { ...P, preset: "lt150" });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((i) => i.price < 150000)).toBe(true);
  });

  it("paginates cumulatively", async () => {
    for (let i = 0; i < 13; i++) await addListing("bandung", `b-${i}`, 50000 + i);
    const total = (await db.listing.count({ where: { city: { slug: "bandung" }, published: true } }));
    expect(total).toBe(14);
    const p1 = await getCatalog({ citySlug: "bandung" }, P);
    const p2 = await getCatalog({ citySlug: "bandung" }, { ...P, page: 2 });
    expect(p1.items.length).toBe(12);
    expect(p2.items.length).toBe(14);
    expect(p2.total).toBe(14);
  });

  it("promoOnly", async () => {
    const r = await getCatalog({ promoOnly: true }, P);
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((i) => i.normalPrice !== null && i.normalPrice > i.price)).toBe(true);
  });

  it("q matches listing or city name case-insensitively", async () => {
    const a = await getCatalog({ q: "tugu" }, P);
    expect(a.items.map((i) => i.name)).toContain("Omah Tugu Inn");
    const b = await getCatalog({ q: "BALI" }, P);
    expect(b.items.some((i) => i.citySlug === "bali")).toBe(true);
  });
});

describe("getListingDetail", () => {
  it("returns null for drafts", async () => {
    expect(await getListingDetail("yogyakarta", "pondok-kaliurang")).toBeNull();
  });

  it("returns null on city mismatch", async () => {
    expect(await getListingDetail("bali", "omah-tugu-inn")).toBeNull();
  });

  it("returns detail for published", async () => {
    const d = await getListingDetail("yogyakarta", "omah-tugu-inn");
    expect(d?.name).toBe("Omah Tugu Inn");
    expect(d?.citySlug).toBe("yogyakarta");
  });

  it("ignores non-ready videos for cover and media", async () => {
    const l = await addListing("bali", "mixed", 100000);
    await db.media.createMany({
      data: [
        { listingId: l.id, kind: "VIDEO", key: "g1", status: "PROCESSING", sortOrder: 0 },
        { listingId: l.id, kind: "PHOTO", key: "p1", sortOrder: 1 },
      ],
    });
    const f = await addListing("bali", "failed", 100001);
    await db.media.create({ data: { listingId: f.id, kind: "VIDEO", key: "g2", status: "FAILED", sortOrder: 0 } });

    const d = await getListingDetail("bali", "mixed");
    expect(d?.cover).toEqual({ kind: "PHOTO", key: "p1" });
    expect(d?.media).toEqual([{ kind: "PHOTO", key: "p1" }]);

    const list = await getCatalog({ citySlug: "bali" }, P);
    expect(list.items.find((i) => i.slug === "mixed")?.cover).toEqual({ kind: "PHOTO", key: "p1" });
    expect(list.items.find((i) => i.slug === "failed")?.cover).toBeNull();
    const fd = await getListingDetail("bali", "failed");
    expect(fd?.cover).toBeNull();
    expect(fd?.media).toEqual([]);
  });
});

describe("findCityByExactName", () => {
  it("trims and ignores case", async () => {
    expect(await findCityByExactName("  malang & batu ")).toEqual({ slug: "malang-batu" });
    expect(await findCityByExactName("nope")).toBeNull();
  });
});
