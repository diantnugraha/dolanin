import type { Metadata } from "next";
import { CatalogView } from "@/components/site/CatalogView";
import { getCatalog } from "@/lib/catalog";
import { parseCatalogParams } from "@/lib/listing";

export const metadata: Metadata = { title: "Semua promo | Dolanin" };

export default async function PromoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = parseCatalogParams(await searchParams);
  const result = await getCatalog({ promoOnly: true }, p);
  return <CatalogView title="Semua promo" basePath="/promo" params={p} result={result} />;
}
