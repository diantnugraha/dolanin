import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/site/CatalogView";
import { getCatalog, getCity, getCityBoard } from "@/lib/catalog";
import { parseCatalogParams } from "@/lib/listing";

type Props = {
  params: Promise<{ kota: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCity((await params).kota);
  return { title: city ? `Penginapan di ${city.name} | Dolanin` : "Dolanin" };
}

export default async function CityPage({ params, searchParams }: Props) {
  const { kota } = await params;
  const city = await getCity(kota);
  if (!city) notFound();
  const p = parseCatalogParams(await searchParams);
  const [result, board] = await Promise.all([getCatalog({ citySlug: city.slug }, p), getCityBoard()]);
  return (
    <CatalogView
      title={city.name}
      banner={{ photoKey: city.photoKey, name: city.name, slug: city.slug }}
      basePath={`/${city.slug}`}
      params={p}
      result={result}
      cities={board.map((c) => ({ slug: c.slug, name: c.name }))}
      currentCity={city.slug}
    />
  );
}
