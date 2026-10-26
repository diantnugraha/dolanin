import "server-only";
import { db } from "@/lib/db";
import type { ListingType, MediaKind, Prisma, VideoStatus } from "../generated/prisma/client";
import type { Cover } from "./catalog";
import { deleteMediaObjects, fetchBunnyVideoState } from "./media-server";
import { isReservedSlug, uniqueSlug } from "./slug";
import { listingInput } from "./validation";

export type SaveResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

export type AdminListingRow = {
  id: string;
  name: string;
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
    ? await db.media.findMany({ where: { listingId: id }, select: { id: true, kind: true, key: true } })
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
      id: true, name: true, area: true, type: true, price: true, normalPrice: true, published: true, updatedAt: true,
      city: { select: { name: true } },
      media: { orderBy: { sortOrder: "asc" }, select: { kind: true, key: true, status: true } },
    },
  });
  return rows.map((r) => {
    const c = r.media.find((m) => m.kind === "PHOTO" || m.status === "READY");
    return {
      id: r.id, name: r.name, area: r.area, cityName: r.city.name, type: r.type, price: r.price,
      normalPrice: r.normalPrice, published: r.published, updatedAt: r.updatedAt,
      cover: !c ? null : c.kind === "PHOTO" ? { kind: "PHOTO", key: c.key } : { kind: "VIDEO", guid: c.key },
      hasVideo: r.media.some((m) => m.kind === "VIDEO"),
    };
  });
}
