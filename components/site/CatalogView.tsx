import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import type { ListingCardData } from "@/lib/catalog";
import { catalogHref, type CatalogParams } from "@/lib/listing";
import type { ListingType } from "../../generated/prisma/client";
import { CoverImage } from "./Media";
import { FilterBar } from "./FilterBar";
import type { CityOption } from "./FilterPanel";
import { FilterSidebar } from "./FilterSidebar";
import { ListingCard } from "./ListingCard";
import { SortControl } from "./SortControl";
import s from "./CatalogView.module.css";

export type CatalogResult = { items: ListingCardData[]; total: number; typeCounts: Record<ListingType, number> };

export function CatalogView({
  title, banner, basePath, query, params, result, cities, currentCity,
}: {
  title: string;
  banner?: { photoKey: string | null; name: string };
  basePath: string;
  query?: string;
  params: CatalogParams;
  result: CatalogResult;
  cities?: CityOption[];
  currentCity?: string;
}) {
  const withQ = (href: string) => (query ? `${href}${href.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}` : href);
  const hrefFor = (patch: Partial<CatalogParams>) => withQ(catalogHref(basePath, params, patch));
  const cityHref = (slug: string) => withQ(catalogHref(`/${slug}`, params, { page: 1 }));
  const resetHref = withQ(basePath);
  const hidden: Record<string, string> = {};
  if (params.types.length) hidden.tipe = params.types.map((t) => t.toLowerCase()).join(",");
  if (params.sort === "desc") hidden.urut = "termahal";
  if (query) hidden.q = query;

  const panel = { params, hrefFor, cityHref, resetHref, action: basePath, hidden, cities, currentCity, typeCounts: result.typeCounts };
  const { items, total } = result;
  const all = result.typeCounts.HOTEL + result.typeCounts.PENGINAPAN + result.typeCounts.VILLA;

  return (
    <div className={`wrap ${s.page}`}>
      {banner ? (
        <div className={s.banner}>
          <div className={s.bannerImg}>
            <CoverImage cover={banner.photoKey ? { kind: "PHOTO", key: banner.photoKey } : null} sizes="(min-width: 1024px) 1120px, 100vw" />
          </div>
          <Link href="/" className={s.back} aria-label="Kembali">
            <IconArrowLeft size={20} stroke={1.75} />
          </Link>
          <div className={s.plate}>
            <h1>{title}</h1>
            <small>{all} penginapan</small>
          </div>
        </div>
      ) : (
        <h1 className={s.h1}>{title}</h1>
      )}

      <FilterBar params={params} hrefFor={hrefFor} cityName={banner?.name} panel={panel} />

      <div className={s.cat}>
        <FilterSidebar {...panel} />
        <main>
          <div className={s.tool}>
            <p>
              <b>{total}</b> hasil
            </p>
            <Link href={resetHref} className={s.metaReset}>Reset</Link>
            <div className={s.sortWrap}>
              <SortControl params={params} hrefFor={hrefFor} />
            </div>
          </div>

          {items.length === 0 ? (
            <div className={s.empty}>
              <p>Belum ada penginapan yang cocok. Coba ubah filternya.</p>
              <Link href={resetHref}>Reset</Link>
            </div>
          ) : (
            <div className={s.list}>
              {items.map((l) => (
                <ListingCard key={l.id} data={l} variant="auto" />
              ))}
            </div>
          )}

          {items.length < total && (
            <div className={s.loadmore}>
              <Link href={hrefFor({ page: params.page + 1 })} scroll={false} className={s.more}>
                Tampilkan lebih banyak
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
