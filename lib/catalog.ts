import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { BookingChannel, ListingType, Prisma } from "../generated/prisma/client";
import { PAGE_SIZE, priceRange, type CatalogParams } from "./listing";

export type Cover = { kind: "PHOTO"; key: string } | { kind: "VIDEO"; guid: string };

export type ListingCardData = {
  id: string;
  name: string;
  slug: string;
  citySlug: string;
  cityName: string;
  type: ListingType;
  area: string;
  price: number;
  normalPrice: number | null;
  cover: Cover | null;
};

export type CityTile = {
  id: string;
  name: string;
  slug: string;
  code: string;
  photoKey: string | null;
  minPrice: number;
  count: number;
};

export type ListingDetail = ListingCardData & {
  description: string;
  mapsUrl: string | null;
  facilities: string[];
  extraFacilities: string[];
  /** Booking links the listing has, in display order (the links themselves stay server-side behind /go). */
  channels: BookingChannel[];
  media: ({ kind: "PHOTO"; key: string } | { kind: "VIDEO"; guid: string; durationSec: number | null })[];
};

const TYPES: ListingType[] = ["HOTEL", "VILLA"];

// Photos and READY videos only; PROCESSING/FAILED videos are never public.
const PUBLIC_MEDIA: Prisma.MediaWhereInput = {
  OR: [{ kind: "PHOTO" }, { kind: "VIDEO", status: "READY" }],
};

type MediaRow = { kind: "PHOTO" | "VIDEO"; key: string; durationSec: number | null };

export const toCover = (m?: MediaRow): Cover | null =>
  !m ? null : m.kind === "PHOTO" ? { kind: "PHOTO", key: m.key } : { kind: "VIDEO", guid: m.key };

const card = (l: {
  id: string; name: string; slug: string; type: ListingType; area: string; price: number;
  normalPrice: number | null; city: { slug: string; name: string }; media: MediaRow[];
}): ListingCardData => ({
  id: l.id, name: l.name, slug: l.slug, citySlug: l.city.slug, cityName: l.city.name,
  type: l.type, area: l.area, price: l.price, normalPrice: l.normalPrice, cover: toCover(l.media[0]),
});

// First public media by sortOrder — the cover rule, shared with admin stats.
export const coverMediaSelect = {
  where: PUBLIC_MEDIA, orderBy: { sortOrder: "asc" }, take: 1,
  select: { kind: true, key: true, durationSec: true },
} satisfies Prisma.Listing$mediaArgs;

const cardSelect = {
  id: true, name: true, slug: true, type: true, area: true, price: true, normalPrice: true,
  city: { select: { slug: true, name: true } },
  media: coverMediaSelect,
} satisfies Prisma.ListingSelect;

export async function getCityBoard(type?: ListingType): Promise<CityTile[]> {
  const groups = await db.listing.groupBy({
    by: ["cityId"],
    where: { published: true, ...(type ? { type } : {}) },
    _min: { price: true },
    _count: { _all: true },
  });
  if (!groups.length) return [];
  const cities = await db.city.findMany({
    where: { id: { in: groups.map((g) => g.cityId) } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const byId = new Map(groups.map((g) => [g.cityId, g]));
  return cities.map((c) => {
    const g = byId.get(c.id)!;
    return {
      id: c.id, name: c.name, slug: c.slug, code: c.code, photoKey: c.photoKey,
      minPrice: g._min.price ?? 0, count: g._count._all,
    };
  });
}

export async function getFeatured(limit = 8): Promise<ListingCardData[]> {
  const rows = await db.listing.findMany({
    where: { published: true, featured: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: cardSelect,
  });
  return rows.map(card);
}

// cache(): generateMetadata, the page and the layout share one query per request.
export const getCity = cache(async (slug: string) => {
  return db.city.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, code: true, photoKey: true },
  });
});

export async function getCatalog(
  scope: { citySlug?: string; promoOnly?: boolean; q?: string },
  p: CatalogParams,
): Promise<{ items: ListingCardData[]; total: number; typeCounts: Record<ListingType, number> }> {
  const { min, max } = priceRange(p);
  const q = scope.q?.trim();
  const and: Prisma.ListingWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { city: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  const base: Prisma.ListingWhereInput = {
    published: true,
    ...(scope.citySlug ? { city: { slug: scope.citySlug } } : {}),
    ...(min !== undefined || max !== undefined
      ? { price: { ...(min !== undefined ? { gte: min } : {}), ...(max !== undefined ? { lte: max } : {}) } }
      : {}),
    ...(and.length ? { AND: and } : {}),
  };
  const where: Prisma.ListingWhereInput = p.types.length ? { ...base, type: { in: p.types } } : base;
  const dir = p.sort === "desc" ? "desc" : "asc";

  // normalPrice > price is a column comparison Prisma cannot express; filter in memory.
  if (scope.promoOnly) {
    const rows = await db.listing.findMany({
      where: { ...base, normalPrice: { not: null } },
      orderBy: [{ price: dir }, { name: "asc" }],
      select: cardSelect,
    });
    const promo = rows.filter((r) => r.normalPrice! > r.price);
    const typeCounts = zeroCounts();
    for (const r of promo) typeCounts[r.type]++;
    const filtered = p.types.length ? promo.filter((r) => p.types.includes(r.type)) : promo;
    return {
      items: filtered.slice(0, PAGE_SIZE * p.page).map(card),
      total: filtered.length,
      typeCounts,
    };
  }

  const [rows, total, groups] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: [{ price: dir }, { name: "asc" }],
      take: PAGE_SIZE * p.page,
      select: cardSelect,
    }),
    db.listing.count({ where }),
    db.listing.groupBy({ by: ["type"], where: base, _count: { _all: true } }),
  ]);
  const typeCounts = zeroCounts();
  for (const g of groups) typeCounts[g.type] = g._count._all;
  return { items: rows.map(card), total, typeCounts };
}

function zeroCounts(): Record<ListingType, number> {
  return Object.fromEntries(TYPES.map((t) => [t, 0])) as Record<ListingType, number>;
}

export async function findCityByExactName(q: string): Promise<{ slug: string } | null> {
  const name = q.trim();
  if (!name) return null;
  return db.city.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { slug: true },
  });
}

export const getListingDetail = cache(async (citySlug: string, slug: string): Promise<ListingDetail | null> => {
  const l = await db.listing.findFirst({
    where: { slug, published: true, city: { slug: citySlug } },
    select: {
      ...cardSelect,
      description: true, mapsUrl: true, facilities: true, extraFacilities: true,
      links: { select: { channel: true }, orderBy: { channel: "asc" } },
      media: { where: PUBLIC_MEDIA, orderBy: { sortOrder: "asc" }, select: { kind: true, key: true, durationSec: true } },
    },
  });
  if (!l) return null;
  return {
    ...card(l),
    description: l.description, mapsUrl: l.mapsUrl, facilities: l.facilities,
    extraFacilities: l.extraFacilities, channels: l.links.map((k) => k.channel),
    media: l.media.map((m) =>
      m.kind === "PHOTO"
        ? { kind: "PHOTO" as const, key: m.key }
        : { kind: "VIDEO" as const, guid: m.key, durationSec: m.durationSec },
    ),
  };
});

export const getSiteSettings = cache(async (): Promise<{ waDefault: string | null }> => {
  const s = await db.setting.findUnique({ where: { id: 1 } });
  return { waDefault: s?.waDefault ?? null };
});
