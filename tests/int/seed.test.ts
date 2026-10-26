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
});
