import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetDb, seedBasic } from "./setup";

describe("seed", () => {
  beforeAll(async () => {
    await resetDb();
    await seedBasic();
  });

  it("creates 5 cities", async () => {
    expect(await db.city.count()).toBe(5);
  });

  it("keeps the draft listing unpublished", async () => {
    const draft = await db.listing.findUnique({ where: { slug: "pondok-kaliurang" } });
    expect(draft?.published).toBe(false);
  });

  it("links omah-tugu-inn to Yogyakarta", async () => {
    const jogja = await db.city.findUniqueOrThrow({ where: { slug: "yogyakarta" } });
    const l = await db.listing.findUnique({ where: { slug: "omah-tugu-inn" } });
    expect(l?.cityId).toBe(jogja.id);
  });

  it("gives every city a published listing and every listing photos", async () => {
    for (const c of await db.city.findMany()) {
      expect(await db.listing.count({ where: { cityId: c.id, published: true } })).toBeGreaterThan(0);
    }
    expect(await db.listing.count({ where: { media: { none: {} } } })).toBe(0);
    expect((await db.setting.findUnique({ where: { id: 1 } }))?.waDefault).toBe("6281200000000");
  });

  it("keeps the seed contract later tests depend on", async () => {
    const preset = ["wifi", "ac", "sarapan", "parkir-motor", "parkir-mobil", "kolam", "dapur", "air-panas"];
    const all = await db.listing.findMany({ include: { media: true, city: true } });
    for (const l of all) {
      expect(l.facilities.every((f) => preset.includes(f)), l.slug).toBe(true);
      const photos = l.media.filter((m) => m.kind === "PHOTO");
      expect(photos.length, l.slug).toBeGreaterThanOrEqual(1);
      expect(photos.length, l.slug).toBeLessThanOrEqual(3);
    }
    expect(all.filter((l) => l.featured).map((l) => l.name).sort()).toEqual(
      ["Kamar Dago Atas", "Ndalem Prawiro", "Omah Tugu Inn", "Villa Sawah Asri"],
    );
    const cityCodes = new Set(all.filter((l) => l.published).map((l) => l.city.slug));
    expect(cityCodes.size).toBe(5);
  });
});
