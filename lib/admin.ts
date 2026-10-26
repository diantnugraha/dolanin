import "server-only";
import { db } from "@/lib/db";
import type { ListingType, MediaKind, Prisma, VideoStatus } from "../generated/prisma/client";
import type { Cover } from "./catalog";
import { deleteMediaObjects, fetchBunnyVideoState } from "./media-server";
import { isReservedSlug, slugify, uniqueSlug } from "./slug";
import { cityInput, listingInput } from "./validation";
import { normalizeWaNumber } from "./wa";

export type SaveResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

export type AdminListingRow = {
  id: string;
  name: string;
  slug: string;
  citySlug: string;
  area: string;
  cityName: string;
  type: ListingType;
  price: number;
  normalPrice: number | null;
  published: boolean;
  updatedAt: Date;
  cover: Cover | null;
  hasVideo: boolean;
};

export async function saveListing(input: unknown, id?: string): Promise<SaveResult> {
  const parsed = listingInput.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, errors };
  }
  const v = parsed.data;
  if (!(await db.city.findUnique({ where: { id: v.cityId }, select: { id: true } }))) {
    return { ok: false, errors: { cityId: "Pilih kota" } };
  }

  const existing = id
    ? await db.media.findMany({ where: { listingId: id }, select: { id: true, kind: true, key: true, status: true } })
    : [];
  if (id && !(await db.listing.findUnique({ where: { id }, select: { id: true } }))) {
    return { ok: false, errors: { form: "Listing tidak ditemukan" } };
  }
  const byKey = new Map(existing.map((m) => [m.key, m]));
  const keep = new Set(v.media.map((m) => m.key));
  const removed = existing.filter((m) => !keep.has(m.key));

  // Bunny's webhook may have fired before this Media row existed; ask Bunny directly.
  const initial = new Map<string, { status: VideoStatus; durationSec: number | null }>();
  await Promise.all(
    v.media
      .filter((m) => m.kind === "VIDEO" && !byKey.has(m.key))
      .map(async (m) => {
        initial.set(m.key, (await fetchBunnyVideoState(m.key)) ?? { status: "PROCESSING", durationSec: null });
      }),
  );

  // A kept video still PROCESSING may have missed its webhook: ask Bunny again (best-effort, outside the tx).
  const reconciled = new Map<string, { status: VideoStatus; durationSec: number | null }>();
  await Promise.all(
    v.media
      .map((m) => byKey.get(m.key))
      .filter((row) => row?.kind === "VIDEO" && row.status === "PROCESSING")
      .map(async (row) => {
        const st = await fetchBunnyVideoState(row!.key);
        if (st && st.status !== "PROCESSING") reconciled.set(row!.id, st);
      }),
  );

  const data = {
    name: v.name, cityId: v.cityId, type: v.type, area: v.area, mapsUrl: v.mapsUrl ?? null,
    price: v.price, normalPrice: v.normalPrice ?? null, description: v.description,
    facilities: v.facilities, extraFacilities: v.extraFacilities, affiliateUrl: v.affiliateUrl,
    waNumber: v.waNumber ?? null, published: v.published, featured: v.featured,
  };

  const run = () => db.$transaction(async (tx) => {
    let listingId: string;
    if (id) {
      await tx.listing.update({ where: { id }, data });
      listingId = id;
      await tx.media.deleteMany({ where: { listingId, id: { in: removed.map((m) => m.id) } } });
      for (const m of v.media) {
        const row = byKey.get(m.key);
        if (row) await tx.media.update({ where: { id: row.id }, data: { sortOrder: m.sortOrder } });
      }
      for (const [mediaId, st] of reconciled) {
        // Monotonic: only a row still PROCESSING moves (the webhook may have set READY/FAILED meanwhile).
        await tx.media.updateMany({
          where: { id: mediaId, status: "PROCESSING" },
          data: { status: st.status, ...(st.durationSec !== null ? { durationSec: st.durationSec } : {}) },
        });
      }
    } else {
      const slug = await uniqueSlug(
        v.name,
        async (s) => isReservedSlug(s) || !!(await tx.listing.findUnique({ where: { slug: s }, select: { id: true } })),
      );
      listingId = (await tx.listing.create({ data: { ...data, slug }, select: { id: true } })).id;
    }
    const fresh = v.media.filter((m) => !byKey.has(m.key));
    if (fresh.length) {
      await tx.media.createMany({
        data: fresh.map((m) => ({
          listingId, kind: m.kind, key: m.key, sortOrder: m.sortOrder,
          status: m.kind === "VIDEO" ? initial.get(m.key)!.status : null,
          durationSec: m.kind === "VIDEO" ? initial.get(m.key)!.durationSec : null,
        })),
      });
    }
    return listingId;
  });

  // A concurrent create can grab the same free slug; the loser hits P2002. Retry the whole tx (it is aborted).
  let savedId: string | undefined;
  for (let attempt = 0; attempt < 3 && savedId === undefined; attempt++) {
    try {
      savedId = await run();
    } catch (e) {
      if (id || (e as { code?: string }).code !== "P2002") throw e;
    }
  }
  if (savedId === undefined) return { ok: false, errors: { form: "Gagal menyimpan, coba lagi." } };

  await cleanup(removed);
  return { ok: true, id: savedId };
}

async function cleanup(items: { kind: MediaKind; key: string }[]) {
  if (!items.length) return;
  try {
    await deleteMediaObjects(items.map((m) => ({ kind: m.kind, key: m.key })));
  } catch (e) {
    console.error("Gagal menghapus objek media (yatim)", e);
  }
}

export async function deleteListing(id: string): Promise<void> {
  const media = await db.media.findMany({ where: { listingId: id }, select: { kind: true, key: true } });
  await db.listing.delete({ where: { id } });
  await cleanup(media);
}

export async function listAdminListings(f: {
  q?: string;
  cityId?: string;
  type?: ListingType;
  status?: "tayang" | "draf";
}): Promise<AdminListingRow[]> {
  const q = f.q?.trim();
  const where: Prisma.ListingWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { area: { contains: q, mode: "insensitive" } }] } : {}),
    ...(f.cityId ? { cityId: f.cityId } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(f.status ? { published: f.status === "tayang" } : {}),
  };
  const rows = await db.listing.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true, slug: true, area: true, type: true, price: true, normalPrice: true, published: true, updatedAt: true,
      city: { select: { name: true, slug: true } },
      media: { orderBy: { sortOrder: "asc" }, select: { kind: true, key: true, status: true } },
    },
  });
  return rows.map((r) => {
    const c = r.media.find((m) => m.kind === "PHOTO" || m.status === "READY");
    return {
      id: r.id, name: r.name, slug: r.slug, citySlug: r.city.slug, area: r.area, cityName: r.city.name, type: r.type, price: r.price,
      normalPrice: r.normalPrice, published: r.published, updatedAt: r.updatedAt,
      cover: !c ? null : c.kind === "PHOTO" ? { kind: "PHOTO", key: c.key } : { kind: "VIDEO", guid: c.key },
      hasVideo: r.media.some((m) => m.kind === "VIDEO"),
    };
  });
}

export async function listCities(): Promise<{ id: string; name: string }[]> {
  return db.city.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export type AdminListingDetail = {
  id: string;
  name: string;
  cityId: string;
  type: ListingType;
  area: string;
  mapsUrl: string;
  price: number;
  normalPrice: number | null;
  description: string;
  facilities: string[];
  extraFacilities: string[];
  affiliateUrl: string;
  waNumber: string;
  published: boolean;
  featured: boolean;
  media: { kind: MediaKind; key: string; status: VideoStatus | null }[];
};

export async function getAdminListing(id: string): Promise<AdminListingDetail | null> {
  const l = await db.listing.findUnique({
    where: { id },
    include: { media: { orderBy: { sortOrder: "asc" }, select: { kind: true, key: true, status: true } } },
  });
  if (!l) return null;
  return {
    id: l.id, name: l.name, cityId: l.cityId, type: l.type, area: l.area, mapsUrl: l.mapsUrl ?? "",
    price: l.price, normalPrice: l.normalPrice, description: l.description, facilities: l.facilities,
    extraFacilities: l.extraFacilities, affiliateUrl: l.affiliateUrl, waNumber: l.waNumber ?? "",
    published: l.published, featured: l.featured, media: l.media,
  };
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const i of issues) errors[String(i.path[0] ?? "form")] ??= i.message;
  return errors;
}

export type AdminCityRow = {
  id: string;
  name: string;
  slug: string;
  code: string;
  photoKey: string | null;
  sortOrder: number;
  listingCount: number;
};

export async function listAdminCities(): Promise<AdminCityRow[]> {
  const rows = await db.city.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, code: true, photoKey: true, sortOrder: true, _count: { select: { listings: true } } },
  });
  return rows.map(({ _count, ...r }) => ({ ...r, listingCount: _count.listings }));
}

export async function getAdminCity(id: string): Promise<AdminCityRow | null> {
  return (await listAdminCities()).find((c) => c.id === id) ?? null;
}

export async function cityListingCount(id: string): Promise<number> {
  return db.listing.count({ where: { cityId: id } });
}

const CITY_RESERVED = "Nama kota ini bentrok dengan halaman lain";
const CITY_TAKEN = "Kota ini sudah ada";

export async function saveCity(input: unknown, id?: string): Promise<SaveResult> {
  const parsed = cityInput.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) };
  const v = parsed.data;
  const slug = slugify(v.name);
  if (!slug) return { ok: false, errors: { name: "Nama kota 2–40 karakter" } };
  if (isReservedSlug(slug)) return { ok: false, errors: { name: CITY_RESERVED } };

  const existing = id ? await db.city.findUnique({ where: { id }, select: { photoKey: true } }) : null;
  if (id && !existing) return { ok: false, errors: { form: "Kota tidak ditemukan" } };
  const clash = await db.city.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) return { ok: false, errors: { name: CITY_TAKEN } };

  const data = { name: v.name, slug, code: v.code, photoKey: v.photoKey ?? null, sortOrder: v.sortOrder };
  let savedId: string;
  try {
    savedId = id
      ? (await db.city.update({ where: { id }, data, select: { id: true } })).id
      : (await db.city.create({ data, select: { id: true } })).id;
  } catch (e) {
    const err = e as { code?: string; meta?: { target?: unknown } };
    if (err.code === "P2002") return { ok: false, errors: { name: CITY_TAKEN } };
    throw e;
  }
  if (existing?.photoKey && existing.photoKey !== (v.photoKey ?? null)) {
    await cleanup([{ kind: "PHOTO", key: existing.photoKey }]);
  }
  return { ok: true, id: savedId };
}

export async function deleteCity(id: string): Promise<"ok" | "has-listings"> {
  const city = await db.city.findUnique({ where: { id }, select: { photoKey: true, _count: { select: { listings: true } } } });
  if (!city) return "ok";
  if (city._count.listings > 0) return "has-listings";
  try {
    await db.city.delete({ where: { id } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2003") return "has-listings";
    if ((e as { code?: string }).code !== "P2025") throw e;
  }
  if (city.photoKey) await cleanup([{ kind: "PHOTO", key: city.photoKey }]);
  return "ok";
}

export async function getSettings(): Promise<{ waDefault: string }> {
  const s = await db.setting.findUnique({ where: { id: 1 }, select: { waDefault: true } });
  return { waDefault: s?.waDefault ?? "" };
}

export async function saveSettings(input: { waDefault: string }): Promise<SaveResult> {
  const raw = String(input?.waDefault ?? "").trim();
  let waDefault: string | null = null;
  if (raw !== "") {
    waDefault = normalizeWaNumber(raw);
    if (!waDefault) return { ok: false, errors: { waDefault: "Nomor WhatsApp tidak valid" } };
  }
  await db.setting.upsert({ where: { id: 1 }, update: { waDefault }, create: { id: 1, waDefault } });
  return { ok: true, id: "1" };
}
