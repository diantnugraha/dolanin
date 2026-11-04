import {
  IconAirConditioning, IconBath, IconBed, IconCar, IconCoffee, IconDoor, IconParking, IconPool, IconToolsKitchen2, IconWifi,
} from "@tabler/icons-react";
import type { ListingType } from "../generated/prisma/client";

export const PAGE_SIZE = 12;
const MAX_PAGE = 50;

export const TYPE_LABEL: Record<ListingType, string> = {
  HOTEL: "Hotel",
  VILLA: "Villa",
};

export const AMENITIES = [
  { key: "wifi", label: "WiFi", Icon: IconWifi },
  { key: "ac", label: "AC", Icon: IconAirConditioning },
  { key: "sarapan", label: "Sarapan", Icon: IconCoffee },
  { key: "parkir-motor", label: "Parkir motor", Icon: IconParking },
  { key: "parkir-mobil", label: "Parkir mobil", Icon: IconCar },
  { key: "kolam", label: "Kolam renang", Icon: IconPool },
  { key: "dapur", label: "Dapur", Icon: IconToolsKitchen2 },
  { key: "air-panas", label: "Air panas", Icon: IconBath },
] as const;

/** Bed types, stored in `facilities` like the amenities; the form shows them as their own group. */
export const BEDS = [
  { key: "bed-single", label: "Single bed", Icon: IconBed },
  { key: "bed-twin", label: "Twin bed", Icon: IconBed },
  { key: "bed-double", label: "Double bed", Icon: IconBed },
  { key: "bed-queen", label: "Queen bed", Icon: IconBed },
  { key: "bed-king", label: "King bed", Icon: IconBed },
] as const;

/** Room count, stored in `facilities` too; one choice at most (validation enforces it). */
export const ROOMS = [
  { key: "kamar-1", label: "1 kamar", Icon: IconDoor },
  { key: "kamar-2", label: "2 kamar", Icon: IconDoor },
  { key: "kamar-3", label: "3 kamar", Icon: IconDoor },
  { key: "kamar-4plus", label: "4+ kamar", Icon: IconDoor },
] as const;

export const FACILITIES = [...AMENITIES, ...BEDS, ...ROOMS] as const;

export type FacilityKey = (typeof FACILITIES)[number]["key"];
export type BedKey = (typeof BEDS)[number]["key"];
export type RoomKey = (typeof ROOMS)[number]["key"];
export type PricePreset = "lt150" | "150-300" | "gt300";
export type CatalogParams = {
  types: ListingType[];
  preset?: PricePreset;
  min?: number;
  max?: number;
  /** Bed types / room counts: a listing matches when it has any of the chosen keys of each group. */
  beds?: BedKey[];
  rooms?: RoomKey[];
  sort: "asc" | "desc";
  page: number;
};

/** Accessible name of a button that opens the media viewer at item i. */
export const mediaLabel = (m: { kind: "PHOTO" | "VIDEO" }, i: number, n: number) =>
  `Lihat ${m.kind === "VIDEO" ? "video" : "foto"} ${i + 1} dari ${n}`;

export function isPromo(l: { price: number; normalPrice: number | null }): boolean {
  return l.normalPrice !== null && l.normalPrice > l.price;
}

const TYPES = Object.keys(TYPE_LABEL) as ListingType[];
const PRESETS: PricePreset[] = ["lt150", "150-300", "gt300"];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// URL values are the keys without their prefix (kasur=double, kamar=4plus); always kept in definition order.
const BED_KEYS = BEDS.map((b) => b.key);
const ROOM_KEYS = ROOMS.map((r) => r.key);
const pickKeys = <K extends string>(raw: string | undefined, keys: readonly K[], prefix: string): K[] => {
  const want = new Set((raw ?? "").split(",").map((v) => prefix + v.trim().toLowerCase()));
  return keys.filter((k) => want.has(k));
};
const urlValues = <K extends string>(chosen: K[] | undefined, keys: readonly K[], prefix: string) =>
  keys.filter((k) => chosen?.includes(k)).map((k) => k.slice(prefix.length)).join(",");
const MAX_PRICE = 100_000_000;
const priceParam = (v: string | undefined) => {
  if (v === undefined || !/^\d+$/.test(v)) return undefined;
  const n = Number(v);
  return n <= MAX_PRICE ? n : undefined;
};

export function parseCatalogParams(sp: Record<string, string | string[] | undefined>): CatalogParams {
  const types = (first(sp.tipe) ?? "")
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter((t, i, a): t is ListingType => (TYPES as string[]).includes(t) && a.indexOf(t) === i);
  const harga = first(sp.harga);
  const preset = PRESETS.find((p) => p === harga);
  const min = priceParam(first(sp.min));
  const max = priceParam(first(sp.max));
  const hal = Number.parseInt(first(sp.hal) ?? "", 10);
  const page = Number.isFinite(hal) ? Math.min(Math.max(hal, 1), MAX_PAGE) : 1;
  const out: CatalogParams = { types, sort: first(sp.urut) === "termahal" ? "desc" : "asc", page };
  if (preset) out.preset = preset;
  if (min !== undefined) out.min = min;
  if (max !== undefined) out.max = max;
  const beds = pickKeys(first(sp.kasur), BED_KEYS, "bed-");
  const rooms = pickKeys(first(sp.kamar), ROOM_KEYS, "kamar-");
  if (beds.length) out.beds = beds;
  if (rooms.length) out.rooms = rooms;
  return out;
}

export function priceRange(p: CatalogParams): { min?: number; max?: number } {
  if (p.preset === "lt150") return { max: 149999 };
  if (p.preset === "150-300") return { min: 150000, max: 300000 };
  if (p.preset === "gt300") return { min: 300001 };
  const r: { min?: number; max?: number } = {};
  if (p.min !== undefined) r.min = p.min;
  if (p.max !== undefined) r.max = p.max;
  return r;
}

/** `kasur` / `kamar` query values of the bed and room filters (also the min/max form's hidden fields). */
export function roomFilterValues(p: Pick<CatalogParams, "beds" | "rooms">): Record<string, string> {
  const out: Record<string, string> = {};
  if (p.beds?.length) out.kasur = urlValues(p.beds, BED_KEYS, "bed-");
  if (p.rooms?.length) out.kamar = urlValues(p.rooms, ROOM_KEYS, "kamar-");
  return out;
}

export function catalogHref(path: string, p: CatalogParams, patch: Partial<CatalogParams>): string {
  const next: CatalogParams = { ...p, ...patch };
  if (!("page" in patch)) next.page = 1;
  const q = new URLSearchParams();
  if (next.types.length) q.set("tipe", next.types.map((t) => t.toLowerCase()).join(","));
  if (next.preset) q.set("harga", next.preset);
  if (next.min !== undefined) q.set("min", String(next.min));
  if (next.max !== undefined) q.set("max", String(next.max));
  for (const [k, v] of Object.entries(roomFilterValues(next))) q.set(k, v);
  if (next.sort === "desc") q.set("urut", "termahal");
  if (next.page > 1) q.set("hal", String(next.page));
  const s = q.toString().replace(/%2C/g, ",");
  return s ? `${path}?${s}` : path;
}
