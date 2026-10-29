import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import * as ms from "@/lib/media-server";
import { deleteListing, getAdminListing, listAdminListings, saveListing } from "@/lib/admin";
import { resetDb } from "./setup";

let cityId: string;
const input = (o: object = {}) => ({
  name: "Omah Tugu Inn", cityId, type: "HOTEL", area: "Tugu", price: "185.000", description: "Nyaman",
  facilities: ["wifi"], extraFacilities: [], links: { AGODA: "https://x.com/a" }, published: true, featured: false,
  media: [{ kind: "PHOTO", key: "p/a", sortOrder: 0 }], ...o,
});
const okId = (r: Awaited<ReturnType<typeof saveListing>>) => {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.id;
};

beforeEach(async () => {
  await resetDb();
  cityId = (await db.city.create({ data: { name: "Yogyakarta", slug: "yogyakarta", code: "YK" } })).id;
  vi.spyOn(ms, "deleteMediaObjects").mockResolvedValue();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("saveListing booking links", () => {
  const channels = async (id: string) =>
    (await db.listingLink.findMany({ where: { listingId: id }, orderBy: { channel: "asc" } })).map((l) => [l.channel, l.url]);

  it("stores one row per filled channel and replaces them on edit", async () => {
    const id = okId(await saveListing(input({ links: { AGODA: "https://agoda.com/a", WHATSAPP: "https://wa.me/62812" } })));
    expect(await channels(id)).toEqual([["AGODA", "https://agoda.com/a"], ["WHATSAPP", "https://wa.me/62812"]]);
    okId(await saveListing(input({ links: { BOOKING: "https://booking.com/b" } }), id));
    expect(await channels(id)).toEqual([["BOOKING", "https://booking.com/b"]]);
  });

  it("a published listing without links is refused with a section error", async () => {
    expect(await saveListing(input({ links: {} }))).toEqual({ ok: false, errors: { links: "Isi minimal satu link pemesanan" } });
  });

  it("a bad link is reported on its own field", async () => {
    const r = await saveListing(input({ links: { TIKET: "ftp://x" } }));
    expect(r).toEqual({ ok: false, errors: { "links.TIKET": "Link harus diawali http:// atau https://" } });
  });

  it("legacyUrl is shown until the listing is saved again", async () => {
    const id = okId(await saveListing(input()));
    await db.listing.update({ where: { id }, data: { legacyUrl: "https://invol.co/abc" } });
    expect((await getAdminListing(id))?.legacyUrl).toBe("https://invol.co/abc");
    expect((await listAdminListings({})).map((r) => r.legacyUrl)).toEqual([true]);
    okId(await saveListing(input(), id));
    expect((await getAdminListing(id))?.legacyUrl).toBeNull();
    expect((await listAdminListings({})).map((r) => r.legacyUrl)).toEqual([false]);
  });

  it("getAdminListing returns links keyed by channel", async () => {
    const id = okId(await saveListing(input({ links: { TRIP: "https://trip.com/t", WHATSAPP: "https://wa.me/62" } })));
    expect((await getAdminListing(id))?.links).toEqual({ TRIP: "https://trip.com/t", WHATSAPP: "https://wa.me/62" });
  });
});

describe("saveListing", () => {
  it("unique slugs", async () => {
    const a = okId(await saveListing(input()));
    const b = okId(await saveListing(input()));
    expect((await db.listing.findUniqueOrThrow({ where: { id: a } })).slug).toBe("omah-tugu-inn");
    expect((await db.listing.findUniqueOrThrow({ where: { id: b } })).slug).toBe("omah-tugu-inn-2");
  });

  it("concurrent creates of the same name both succeed with distinct slugs", async () => {
    const rs = await Promise.all([saveListing(input()), saveListing(input())]);
    const slugs = (await Promise.all(rs.map((r) => db.listing.findUniqueOrThrow({ where: { id: okId(r) } })))).map((l) => l.slug);
    expect(slugs.sort()).toEqual(["omah-tugu-inn", "omah-tugu-inn-2"]);
  });

  it("edit keeps slug and removes dropped photo objects after commit", async () => {
    const id = okId(
      await saveListing(input({ media: [{ kind: "PHOTO", key: "p/a", sortOrder: 0 }, { kind: "PHOTO", key: "p/b", sortOrder: 1 }] })),
    );
    const r = await saveListing(input({ name: "Baru", media: [{ kind: "PHOTO", key: "p/b", sortOrder: 0 }] }), id);
    expect(r.ok).toBe(true);
    const l = await db.listing.findUniqueOrThrow({ where: { id }, include: { media: true } });
    expect(l.slug).toBe("omah-tugu-inn");
    expect(l.name).toBe("Baru");
    expect(l.media.map((m) => m.key)).toEqual(["p/b"]);
    expect(ms.deleteMediaObjects).toHaveBeenCalledWith([{ kind: "PHOTO", key: "p/a" }]);
  });

  it("delete failure after commit still ok", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const id = okId(await saveListing(input()));
    vi.mocked(ms.deleteMediaObjects).mockRejectedValue(new Error("boom"));
    const r = await saveListing(input({ media: [{ kind: "PHOTO", key: "p/z", sortOrder: 0 }] }), id);
    expect(r.ok).toBe(true);
  });

  it("unknown city -> field error", async () => {
    const r = await saveListing(input({ cityId: "nope" }));
    expect(r).toEqual({ ok: false, errors: { cityId: "Pilih kota" } });
  });

  it("validation errors returned", async () => {
    const r = await saveListing(input({ name: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name).toBe("Nama wajib diisi");
  });

  it("new video gets state from Bunny; existing keeps status", async () => {
    vi.stubEnv("BUNNY_LIBRARY_ID", "42");
    vi.stubEnv("BUNNY_API_KEY", "k");
    const f = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ status: 4, length: 12.4 }), { status: 200 }));
    const id = okId(await saveListing(input({ media: [{ kind: "VIDEO", key: "g1", sortOrder: 0 }] })));
    expect(await db.media.findFirstOrThrow({ where: { listingId: id } })).toMatchObject({ status: "READY", durationSec: 12 });
    f.mockClear();
    await saveListing(input({ media: [{ kind: "VIDEO", key: "g1", sortOrder: 0 }, { kind: "PHOTO", key: "p/a", sortOrder: 1 }] }), id);
    expect(f).not.toHaveBeenCalled();
    const v = await db.media.findFirstOrThrow({ where: { listingId: id, kind: "VIDEO" } });
    expect(v).toMatchObject({ status: "READY", durationSec: 12 });
    const p = await db.media.findFirstOrThrow({ where: { listingId: id, kind: "PHOTO" } });
    expect(p.status).toBeNull();
  });

  it("new video without Bunny env or on failure -> PROCESSING", async () => {
    const id = okId(await saveListing(input({ media: [{ kind: "VIDEO", key: "g2", sortOrder: 0 }] })));
    expect(await db.media.findFirstOrThrow({ where: { listingId: id } })).toMatchObject({ status: "PROCESSING", durationSec: null });
    vi.stubEnv("BUNNY_LIBRARY_ID", "42");
    vi.stubEnv("BUNNY_API_KEY", "k");
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("net"));
    const id2 = okId(await saveListing(input({ media: [{ kind: "VIDEO", key: "g3", sortOrder: 0 }] })));
    expect((await db.media.findFirstOrThrow({ where: { listingId: id2 } })).status).toBe("PROCESSING");
  });
});

describe("saveListing reconciles existing PROCESSING videos with Bunny", () => {
  const video = (status: "PROCESSING" | "READY" | "FAILED", durationSec: number | null = null) =>
    async () => {
      const id = okId(await saveListing(input({ media: [{ kind: "PHOTO", key: "p/a", sortOrder: 0 }] })));
      await db.media.create({ data: { listingId: id, kind: "VIDEO", key: "gv", sortOrder: 1, status, durationSec } });
      return id;
    };
  const media = [{ kind: "PHOTO", key: "p/a", sortOrder: 0 }, { kind: "VIDEO", key: "gv", sortOrder: 1 }];
  const bunny = (status: number, length: number) => {
    vi.stubEnv("BUNNY_LIBRARY_ID", "42");
    vi.stubEnv("BUNNY_API_KEY", "k");
    return vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ status, length }), { status: 200 }));
  };

  it("missed webhook: PROCESSING becomes READY with duration after the next save", async () => {
    const id = await video("PROCESSING")();
    const f = bunny(4, 21.6);
    expect((await saveListing(input({ media }), id)).ok).toBe(true);
    expect(f.mock.calls[0][0]).toBe("https://video.bunnycdn.com/library/42/videos/gv");
    expect(await db.media.findFirstOrThrow({ where: { listingId: id, kind: "VIDEO" } })).toMatchObject({
      status: "READY", durationSec: 22, sortOrder: 1,
    });
  });

  it("Bunny error: PROCESSING becomes FAILED", async () => {
    const id = await video("PROCESSING")();
    bunny(5, 0);
    await saveListing(input({ media }), id);
    expect((await db.media.findFirstOrThrow({ where: { listingId: id, kind: "VIDEO" } })).status).toBe("FAILED");
  });

  it("monotonic: READY and FAILED are never downgraded by a stale Bunny answer", async () => {
    const ready = await video("READY", 12)();
    bunny(2, 0);
    await saveListing(input({ media }), ready);
    expect(await db.media.findFirstOrThrow({ where: { listingId: ready, kind: "VIDEO" } })).toMatchObject({
      status: "READY", durationSec: 12,
    });
    await resetDb();
    cityId = (await db.city.create({ data: { name: "Yogyakarta", slug: "yogyakarta", code: "YK" } })).id;
    const failed = await video("FAILED")();
    await saveListing(input({ media }), failed);
    expect((await db.media.findFirstOrThrow({ where: { listingId: failed, kind: "VIDEO" } })).status).toBe("FAILED");
  });

  it("Bunny unreachable: save still succeeds and the video stays PROCESSING", async () => {
    const id = await video("PROCESSING")();
    vi.stubEnv("BUNNY_LIBRARY_ID", "42");
    vi.stubEnv("BUNNY_API_KEY", "k");
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("net"));
    expect((await saveListing(input({ media }), id)).ok).toBe(true);
    expect((await db.media.findFirstOrThrow({ where: { listingId: id, kind: "VIDEO" } })).status).toBe("PROCESSING");
  });
});

describe("fetchBunnyVideoState", () => {
  it("maps statuses", async () => {
    vi.stubEnv("BUNNY_LIBRARY_ID", "42");
    vi.stubEnv("BUNNY_API_KEY", "k");
    const st = async (status: number) => {
      vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ status, length: 3 }), { status: 200 }));
      return (await ms.fetchBunnyVideoState("g"))?.status;
    };
    expect(await st(4)).toBe("READY");
    expect(await st(5)).toBe("FAILED");
    expect(await st(6)).toBe("FAILED");
    expect(await st(2)).toBe("PROCESSING");
    expect(await st(8)).toBe("PROCESSING");
  });
});

describe("deleteListing / list", () => {
  it("cascades media and events, deletes objects", async () => {
    const id = okId(await saveListing(input()));
    await db.event.create({ data: { listingId: id, kind: "VIEW", cityId, type: "HOTEL" } });
    await deleteListing(id);
    expect(await db.media.count({ where: { listingId: id } })).toBe(0);
    expect(await db.event.count({ where: { listingId: id } })).toBe(0);
    expect(ms.deleteMediaObjects).toHaveBeenCalledWith([{ kind: "PHOTO", key: "p/a" }]);
  });

  it("is idempotent: a double-submitted delete resolves the second time", async () => {
    const id = okId(await saveListing(input()));
    await deleteListing(id);
    await expect(deleteListing(id)).resolves.toBeUndefined();
    expect(await db.listing.count({ where: { id } })).toBe(0);
  });

  it("filters and rows", async () => {
    const before = await db.listing.count();
    await saveListing(input({ published: false, name: "Draf Satu", media: [] }));
    okId(await saveListing(input({ media: [{ kind: "VIDEO", key: "gx", sortOrder: 0 }, { kind: "PHOTO", key: "p/q", sortOrder: 1 }] })));
    const draf = await listAdminListings({ status: "draf" });
    expect(draf.length).toBeGreaterThan(0);
    expect(draf.every((r) => !r.published)).toBe(true);
    const tugu = await listAdminListings({ q: "tugu" });
    expect(tugu.map((r) => r.name)).toContain("Omah Tugu Inn");
    expect(tugu.every((r) => /tugu/i.test(r.name + r.area))).toBe(true);
    const row = tugu.find((r) => r.name === "Omah Tugu Inn")!;
    expect(row.hasVideo).toBe(true);
    expect(row.cover).toEqual({ kind: "PHOTO", key: "p/q" }); // video is PROCESSING -> skipped
    expect(row.cityName).toBeTruthy();
    expect((await listAdminListings({})).length).toBe(before + 2);
  });
});
