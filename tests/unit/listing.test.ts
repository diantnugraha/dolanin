import { describe, expect, it } from "vitest";
import {
  FACILITIES, PAGE_SIZE, type CatalogParams, TYPE_LABEL, catalogHref, isPromo, mediaLabel, parseCatalogParams, priceRange,
} from "@/lib/listing";

describe("listing", () => {
  it("detects promo", () => {
    expect(isPromo({ price: 185000, normalPrice: 240000 })).toBe(true);
    expect(isPromo({ price: 185000, normalPrice: 185000 })).toBe(false);
    expect(isPromo({ price: 185000, normalPrice: null })).toBe(false);
  });
  it("parses params", () => {
    expect(parseCatalogParams({ tipe: "hotel,villa", harga: "lt150", urut: "termahal", hal: "2" })).toEqual({
      types: ["HOTEL", "VILLA"], preset: "lt150", sort: "desc", page: 2,
    });
    expect(parseCatalogParams({ tipe: "kapal", urut: "x", hal: "-1" })).toEqual({ types: [], sort: "asc", page: 1 });
    expect(parseCatalogParams({ hal: "999" }).page).toBe(50);
    expect(parseCatalogParams({ tipe: ["villa", "hotel"], min: ["100000"], max: "250000" })).toEqual({
      types: ["VILLA"], min: 100000, max: 250000, sort: "asc", page: 1,
    });
  });
  it("bounds min/max", () => {
    expect(parseCatalogParams({ min: "99999999999" }).min).toBeUndefined();
    expect(parseCatalogParams({ max: "9".repeat(400) }).max).toBeUndefined();
    expect(parseCatalogParams({ min: "100000" }).min).toBe(100000);
  });
  it("computes price range", () => {
    const b: CatalogParams = { types: [], sort: "asc", page: 1 };
    expect(priceRange({ ...b, preset: "lt150" })).toEqual({ max: 149999 });
    expect(priceRange({ ...b, preset: "150-300" })).toEqual({ min: 150000, max: 300000 });
    expect(priceRange({ ...b, preset: "gt300" })).toEqual({ min: 300001 });
    expect(priceRange({ ...b, min: 100000, max: 250000 })).toEqual({ min: 100000, max: 250000 });
  });
  it("builds hrefs", () => {
    expect(catalogHref("/yogyakarta", { types: ["HOTEL"], sort: "asc", page: 3 }, { sort: "desc" })).toBe(
      "/yogyakarta?tipe=hotel&urut=termahal",
    );
    expect(catalogHref("/yogyakarta", { types: [], sort: "asc", page: 3 }, { page: 4 })).toBe("/yogyakarta?hal=4");
    expect(catalogHref("/x", { types: [], sort: "asc", page: 1 }, {})).toBe("/x");
  });
  it("labels media for the viewer buttons", () => {
    expect(mediaLabel({ kind: "PHOTO" }, 1, 3)).toBe("Lihat foto 2 dari 3");
    expect(mediaLabel({ kind: "VIDEO" }, 0, 4)).toBe("Lihat video 1 dari 4");
  });

  it("exposes constants", () => {
    expect(PAGE_SIZE).toBe(12);
    expect(TYPE_LABEL).toEqual({ HOTEL: "Hotel", PENGINAPAN: "Penginapan", VILLA: "Villa" });
    expect(FACILITIES.map((f) => f.key)).toEqual([
      "wifi", "ac", "sarapan", "parkir-motor", "parkir-mobil", "kolam", "dapur", "air-panas",
    ]);
    expect(FACILITIES.every((f) => f.Icon)).toBe(true);
  });
});
