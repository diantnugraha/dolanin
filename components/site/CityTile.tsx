import { ViewTransition } from "react";
import Link from "next/link";
import { IconArrowUpRight } from "@tabler/icons-react";
import type { CityTile as CityTileData } from "@/lib/catalog";
import { formatRupiahShort } from "@/lib/format";
import { CoverImage } from "./Media";
import s from "./CityTile.module.css";

export function CityTile({ city, className = "" }: { city: CityTileData; className?: string }) {
  return (
    <Link href={`/${city.slug}`} className={`${s.city} ${className}`} data-city={city.slug}>
      <ViewTransition name={`city-${city.slug}`} share="city-grow" default="none">
        <div className={s.cover}>
          <CoverImage
            cover={city.photoKey ? { kind: "PHOTO", key: city.photoKey } : null}
            sizes="(min-width: 1024px) 280px, 50vw"
          />
        </div>
      </ViewTransition>
      <span className={s.code}>{city.code}</span>
      <span className={s.plate}>
        <b>{city.name}</b>
        <span className={s.meta}>
          <small>
            mulai <em>{formatRupiahShort(city.minPrice)}</em>
          </small>
          <small className={s.count}>{city.count} pilihan</small>
        </span>
      </span>
    </Link>
  );
}

/** Biru laut tile, desktop board only: links to /kota ("Semua kota" when nothing is hidden). */
export function MoreCitiesTile({ n, className = "" }: { n: number; className?: string }) {
  const label = n > 0 ? `${n} kota lainnya` : "Semua kota";
  return (
    <Link href="/kota" className={`${s.city} ${s.all} ${className}`}>
      <IconArrowUpRight size={28} stroke={1.5} aria-hidden="true" />
      <b>{label}</b>
    </Link>
  );
}
