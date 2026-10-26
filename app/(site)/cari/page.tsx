import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CatalogView } from "@/components/site/CatalogView";
import { findCityByExactName, getCatalog } from "@/lib/catalog";
import { parseCatalogParams } from "@/lib/listing";

export const metadata: Metadata = { title: "Cari | Dolanin" };

export default async function CariPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? "").trim();
  if (!q) redirect("/");
  const city = await findCityByExactName(q);
  if (city) redirect(`/${city.slug}`);
  const p = parseCatalogParams(sp);
  const result = await getCatalog({ q }, p);
  return <CatalogView title={`Hasil untuk “${q}”`} basePath="/cari" query={q} params={p} result={result} />;
}
