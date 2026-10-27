import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS, isReservedSlug, slugify, uniqueSlug } from "@/lib/slug";

describe("slug", () => {
  it("slugifies", () => {
    expect(slugify("Malang & Batu")).toBe("malang-batu");
    expect(slugify("Villa  Sawah—Asri!")).toBe("villa-sawah-asri");
    expect(slugify("Café Ubud")).toBe("cafe-ubud");
  });
  it("lists reserved slugs", () => {
    expect(RESERVED_SLUGS).toEqual(["kota", "promo", "cari", "admin", "go", "api"]);
  });
  it("finds a free suffix", async () => {
    expect(await uniqueSlug("omah", async (s) => ["omah", "omah-2"].includes(s))).toBe("omah-3");
    expect(await uniqueSlug("omah", async () => false)).toBe("omah");
  });
  it("detects reserved slugs", () => {
    for (const r of ["kota", "promo", "cari", "admin", "go", "api"]) expect(isReservedSlug(r)).toBe(true);
    expect(isReservedSlug("yogyakarta")).toBe(false);
  });
});
