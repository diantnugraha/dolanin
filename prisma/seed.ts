// Data contoh untuk dev/E2E saja. JANGAN dijalankan di produksi.
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ListingType } from "../generated/prisma/client";
import { hashPassword } from "../lib/password";

const cities = [
  { name: "Yogyakarta", slug: "yogyakarta", code: "YK", photoKey: "seed-jogja" },
  { name: "Bali", slug: "bali", code: "DPS", photoKey: "seed-bali" },
  { name: "Bandung", slug: "bandung", code: "BD", photoKey: "seed-bandung" },
  { name: "Malang & Batu", slug: "malang-batu", code: "ML", photoKey: "seed-malang" },
  { name: "Lombok", slug: "lombok", code: "LOP", photoKey: "seed-lombok" },
];

type SeedListing = {
  name: string;
  slug: string;
  city: string; // city slug
  type: ListingType;
  area: string;
  price: number;
  normalPrice: number | null;
  featured: boolean;
  published: boolean;
  description: string;
  facilities: string[];
  photos: string[];
  mapsUrl?: string;
};

const listings: SeedListing[] = [
  {
    name: "Omah Tugu Inn", slug: "omah-tugu-inn", city: "yogyakarta", type: "HOTEL",
    area: "Jetis, dekat Tugu", price: 185000, normalPrice: 240000, featured: true, published: true,
    description: "Hotel bersih dan nyaman, jalan kaki ke Tugu dan stasiun.",
    facilities: ["wifi", "ac", "sarapan"], photos: ["seed-room-3", "seed-room-1", "seed-room-2"],
    mapsUrl: "https://maps.app.goo.gl/omahtugu1nn",
  },
  {
    name: "Ndalem Prawiro", slug: "ndalem-prawiro", city: "yogyakarta", type: "HOTEL",
    area: "Prawirotaman", price: 95000, normalPrice: 130000, featured: true, published: true,
    description: "Penginapan bernuansa Jawa di kawasan kafe Prawirotaman.",
    facilities: ["wifi", "air-panas"], photos: ["seed-room-1", "seed-room-2"],
  },
  {
    name: "Kamar Kayu Malioboro", slug: "kamar-kayu-malioboro", city: "yogyakarta", type: "HOTEL",
    area: "Sosrowijayan", price: 210000, normalPrice: null, featured: false, published: true,
    description: "Kamar kayu hangat, beberapa langkah dari Malioboro.",
    facilities: ["wifi", "ac"], photos: ["seed-room-2"],
  },
  {
    name: "Villa Lereng Kaliurang", slug: "villa-lereng-kaliurang", city: "yogyakarta", type: "VILLA",
    area: "Kaliurang", price: 480000, normalPrice: null, featured: false, published: true,
    description: "Villa sejuk di lereng Merapi, cocok untuk rombongan kecil.",
    facilities: ["wifi", "parkir-motor", "dapur"], photos: ["seed-villa-1", "seed-bungalow-1", "seed-room-3"],
  },
  {
    name: "Hotel Gedong Kuning", slug: "hotel-gedong-kuning", city: "yogyakarta", type: "HOTEL",
    area: "Banguntapan", price: 290000, normalPrice: null, featured: false, published: true,
    description: "Hotel tenang dengan kolam renang kecil di timur kota.",
    facilities: ["wifi", "ac", "kolam"], photos: ["seed-room-3", "seed-room-1"],
  },
  {
    name: "Pondok Kaliurang", slug: "pondok-kaliurang", city: "yogyakarta", type: "HOTEL",
    area: "Kaliurang", price: 260000, normalPrice: null, featured: false, published: false,
    description: "Draf: pondok sederhana dekat kawasan wisata Kaliurang.",
    facilities: ["air-panas"], photos: ["seed-room-1"],
  },
  {
    name: "Villa Sawah Asri", slug: "villa-sawah-asri", city: "bali", type: "VILLA",
    area: "Canggu", price: 650000, normalPrice: 850000, featured: true, published: true,
    description: "Villa privat menghadap sawah dengan kolam renang pribadi.",
    facilities: ["wifi", "ac", "kolam", "dapur"], photos: ["seed-villa-1", "seed-bungalow-1", "seed-room-2"],
  },
  {
    name: "Kamar Dago Atas", slug: "kamar-dago-atas", city: "bandung", type: "HOTEL",
    area: "Dago", price: 245000, normalPrice: 320000, featured: true, published: true,
    description: "Kamar di Dago atas dengan udara sejuk dan pemandangan kota.",
    facilities: ["wifi", "ac", "sarapan"], photos: ["seed-room-2", "seed-room-3"],
  },
  {
    name: "Wisma Batu Indah", slug: "wisma-batu-indah", city: "malang-batu", type: "HOTEL",
    area: "Batu", price: 140000, normalPrice: null, featured: false, published: true,
    description: "Wisma sederhana, dekat alun-alun dan wisata petik apel.",
    facilities: ["wifi", "parkir-motor"], photos: ["seed-room-1"],
  },
  {
    name: "Bungalow Gili Meno", slug: "bungalow-gili-meno", city: "lombok", type: "VILLA",
    area: "Gili Meno", price: 175000, normalPrice: null, featured: false, published: true,
    description: "Bungalow dekat pantai di pulau yang tenang tanpa kendaraan bermotor.",
    facilities: ["sarapan", "air-panas"], photos: ["seed-bungalow-1", "seed-villa-1"],
  },
];

export async function seedData(db: PrismaClient) {
  const cityRows = [];
  for (const [sortOrder, c] of cities.entries()) {
    cityRows.push(
      await db.city.upsert({ where: { slug: c.slug }, update: { ...c, sortOrder }, create: { ...c, sortOrder } }),
    );
  }
  const cityId = new Map(cityRows.map((c) => [c.slug, c.id]));

  const listingRows = [];
  for (const { city, photos, ...l } of listings) {
    const data = {
      ...l,
      cityId: cityId.get(city)!,
      extraFacilities: [],
      affiliateUrl: `https://example.com/aff/${l.slug}`,
    };
    const row = await db.listing.upsert({ where: { slug: l.slug }, update: data, create: data });
    await db.media.deleteMany({ where: { listingId: row.id } });
    await db.media.createMany({
      data: photos.map((key, sortOrder) => ({ listingId: row.id, kind: "PHOTO" as const, key, sortOrder })),
    });
    listingRows.push(row);
  }

  await db.setting.upsert({ where: { id: 1 }, update: { waDefault: "6281200000000" }, create: { id: 1, waDefault: "6281200000000" } });
  // Admin contoh untuk dev/E2E. Di produksi pakai `npm run admin:password`.
  const passwordHash = await hashPassword("dolanin-dev-123");
  await db.admin.upsert({
    where: { id: 1 },
    update: { username: "admin", passwordHash, failedCount: 0, lockedUntil: null },
    create: { id: 1, username: "admin", passwordHash },
  });
  return { cities: cityRows, listings: listingRows };
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The seed resets the admin to a public dev password: only local `*_dev` / `*_test` DBs, unless ALLOW_SEED=1.
 * The name check matters on a VPS, where the production DB is also on localhost.
 */
export function canSeed(url: string | undefined, env: Record<string, string | undefined>): boolean {
  if (env.ALLOW_SEED === "1") return true;
  try {
    const u = new URL(url ?? "");
    return LOCAL_HOSTS.has(u.hostname) && /_(dev|test)$/.test(u.pathname);
  } catch {
    return false;
  }
}

async function main() {
  if (!canSeed(process.env.DATABASE_URL, process.env)) {
    console.error(
      "Seed ditolak: DATABASE_URL bukan database lokal berakhiran _dev/_test. Seed menimpa admin dengan password dev publik.\n" +
        "Seed refused: DATABASE_URL is not a local *_dev/*_test database. Set ALLOW_SEED=1 only if you really mean it.",
    );
    process.exit(1);
  }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    await seedData(db);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
