import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import * as ms from "@/lib/media-server";
import { RESERVED_SLUGS } from "@/lib/slug";
import { cityListingCount, deleteCity, getSettings, listAdminCities, saveCity, saveSettings } from "@/lib/admin";
import { resetDb } from "./setup";

let del: ReturnType<typeof vi.spyOn>;
const city = (o: object = {}) => ({ name: "Yogyakarta", code: "YK", sortOrder: 0, ...o });
const okId = (r: Awaited<ReturnType<typeof saveCity>>) => {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.id;
};

beforeEach(async () => {
  await resetDb();
  del = vi.spyOn(ms, "deleteMediaObjects").mockResolvedValue();
});
afterEach(() => vi.restoreAllMocks());

describe("saveCity", () => {
  it("creates with slug from name", async () => {
    const id = okId(await saveCity(city({ name: "Yogyakarta Kota" })));
    expect(await db.city.findUniqueOrThrow({ where: { id } })).toMatchObject({ slug: "yogyakarta-kota", code: "YK" });
  });

  it("rejects every reserved slug without renaming", async () => {
    for (const s of RESERVED_SLUGS) {
      const r = await saveCity(city({ name: s.toUpperCase(), code: "PR" }));
      expect(r).toEqual({ ok: false, errors: { name: "Nama kota ini bentrok dengan halaman lain" } });
    }
    expect(await db.city.count()).toBe(0);
  });

  it("rejects a name whose slug another city uses (and allows keeping own slug)", async () => {
    const id = okId(await saveCity(city()));
    expect(await saveCity(city({ name: "yogyakarta", code: "YG" }))).toEqual({ ok: false, errors: { name: "Kota ini sudah ada" } });
    expect((await saveCity(city({ sortOrder: 5 }), id)).ok).toBe(true);
  });

  it("returns field errors for invalid code", async () => {
    expect(await saveCity(city({ code: "yk" }))).toEqual({ ok: false, errors: { code: "Kode 2–4 huruf besar" } });
  });

  it("regenerates slug when the name changes", async () => {
    const id = okId(await saveCity(city()));
    await saveCity(city({ name: "Jogja" }), id);
    expect((await db.city.findUniqueOrThrow({ where: { id } })).slug).toBe("jogja");
  });

  it("unknown id gives form error", async () => {
    expect(await saveCity(city(), "nope")).toEqual({ ok: false, errors: { form: "Kota tidak ditemukan" } });
  });

  it("replacing the photo deletes the old object after save; same key keeps it", async () => {
    const id = okId(await saveCity(city({ photoKey: "p/a" })));
    await saveCity(city({ photoKey: "p/a" }), id);
    expect(del).not.toHaveBeenCalled();
    await saveCity(city({ photoKey: "p/b" }), id);
    expect(del).toHaveBeenCalledWith([{ kind: "PHOTO", key: "p/a" }]);
    await saveCity(city({ photoKey: "" }), id);
    expect(del).toHaveBeenCalledWith([{ kind: "PHOTO", key: "p/b" }]);
    expect((await db.city.findUniqueOrThrow({ where: { id } })).photoKey).toBeNull();
  });

  it("a failing S3 delete does not fail the save", async () => {
    const id = okId(await saveCity(city({ photoKey: "p/a" })));
    del.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await saveCity(city({ photoKey: "p/b" }), id)).ok).toBe(true);
  });
});

describe("deleteCity", () => {
  it("refuses a city with listings", async () => {
    const id = okId(await saveCity(city({ photoKey: "p/a" })));
    await db.listing.create({
      data: { name: "X", slug: "x", cityId: id, type: "HOTEL", area: "a", price: 100000, description: "d", facilities: [], extraFacilities: [] },
    });
    expect(await deleteCity(id)).toBe("has-listings");
    expect(await cityListingCount(id)).toBe(1);
    expect(await db.city.count()).toBe(1);
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes an empty city and its photo", async () => {
    const id = okId(await saveCity(city({ photoKey: "p/a" })));
    expect(await deleteCity(id)).toEqual("ok");
    expect(await db.city.count()).toBe(0);
    expect(del).toHaveBeenCalledWith([{ kind: "PHOTO", key: "p/a" }]);
  });

  it("is idempotent: deleting twice returns ok both times", async () => {
    const id = okId(await saveCity(city({ photoKey: "p/a" })));
    expect(await deleteCity(id)).toEqual("ok");
    expect(await deleteCity(id)).toEqual("ok");
  });

  it("photo delete failure is swallowed", async () => {
    const id = okId(await saveCity(city({ photoKey: "p/a" })));
    del.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await deleteCity(id)).toEqual("ok");
  });
});

describe("listAdminCities", () => {
  it("returns listing counts ordered by sortOrder", async () => {
    const b = okId(await saveCity(city({ name: "Bali", code: "BB", sortOrder: 2 })));
    okId(await saveCity(city({ name: "Aceh", code: "AA", sortOrder: 1 })));
    await db.listing.create({
      data: { name: "X", slug: "x", cityId: b, type: "HOTEL", area: "a", price: 100000, description: "d", facilities: [], extraFacilities: [] },
    });
    const rows = await listAdminCities();
    expect(rows.map((r) => [r.name, r.listingCount])).toEqual([["Aceh", 0], ["Bali", 1]]);
  });
});

describe("saveSettings", () => {
  it("normalizes and stores the number", async () => {
    expect((await saveSettings({ waDefault: "0812 0000 0000" })).ok).toBe(true);
    expect((await db.setting.findUniqueOrThrow({ where: { id: 1 } })).waDefault).toBe("6281200000000");
    expect(await getSettings()).toEqual({ waDefault: "6281200000000" });
  });
  it("empty string stores null", async () => {
    await saveSettings({ waDefault: "0812 0000 0000" });
    expect((await saveSettings({ waDefault: "  " })).ok).toBe(true);
    expect((await db.setting.findUniqueOrThrow({ where: { id: 1 } })).waDefault).toBeNull();
  });
  it("rejects garbage", async () => {
    expect(await saveSettings({ waDefault: "abc" })).toEqual({ ok: false, errors: { waDefault: "Nomor WhatsApp tidak valid" } });
  });
});
