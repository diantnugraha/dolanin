import {
  IconAirConditioning, IconBath, IconCar, IconCoffee, IconParking, IconPool, IconToolsKitchen2, IconWifi,
} from "@tabler/icons-react";
import type { ListingType } from "../generated/prisma/client";

export const PAGE_SIZE = 12;
const MAX_PAGE = 50;

export const TYPE_LABEL: Record<ListingType, string> = {
  HOTEL: "Hotel",
  PENGINAPAN: "Penginapan",
  VILLA: "Villa",
};

export const FACILITIES = [
  { key: "wifi", label: "WiFi", Icon: IconWifi },
  { key: "ac", label: "AC", Icon: IconAirConditioning },
  { key: "sarapan", label: "Sarapan", Icon: IconCoffee },
  { key: "parkir-motor", label: "Parkir motor", Icon: IconParking },
  { key: "parkir-mobil", label: "Parkir mobil", Icon: IconCar },
  { key: "kolam", label: "Kolam renang", Icon: IconPool },
  { key: "dapur", label: "Dapur", Icon: IconToolsKitchen2 },
  { key: "air-panas", label: "Air panas", Icon: IconBath },
] as const;

export type FacilityKey = (typeof FACILITIES)[number]["key"];
export type PricePreset = "lt150" | "150-300" | "gt300";
export type CatalogParams = {
  types: ListingType[];
  preset?: PricePreset;
  min?: number;
  max?: number;
  sort: "asc" | "desc";
  page: number;
};

export function isPromo(l: { price: number; normalPrice: number | null }): boolean {
  return l.normalPrice !== null && l.normalPrice > l.price;
}

const TYPES = Object.keys(TYPE_LABEL) as ListingType[];
const PRESETS: PricePreset[] = ["lt150", "150-300", "gt300"];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
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

export function catalogHref(path: string, p: CatalogParams, patch: Partial<CatalogParams>): string {
  const next: CatalogParams = { ...p, ...patch };
  if (!("page" in patch)) next.page = 1;
  const q = new URLSearchParams();
  if (next.types.length) q.set("tipe", next.types.map((t) => t.toLowerCase()).join(","));
  if (next.preset) q.set("harga", next.preset);
  if (next.min !== undefined) q.set("min", String(next.min));
  if (next.max !== undefined) q.set("max", String(next.max));
  if (next.sort === "desc") q.set("urut", "termahal");
  if (next.page > 1) q.set("hal", String(next.page));
  const s = q.toString().replace(/%2C/g, ",");
  return s ? `${path}?${s}` : path;
}
