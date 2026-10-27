import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { CityTile, MoreCitiesTile } from "@/components/site/CityTile";
import { ListingCard } from "@/components/site/ListingCard";
import { TypeSegment } from "@/components/site/TypeSegment";
import { WaBlock } from "@/components/site/WaBlock";
import { getCityBoard, getFeatured, getSiteSettings } from "@/lib/catalog";
import type { ListingType } from "../../generated/prisma/client";
import s from "./page.module.css";

const TIPE: Record<string, ListingType> = { hotel: "HOTEL", penginapan: "PENGINAPAN", villa: "VILLA" };

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ tipe?: string | string[] }> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.tipe) ? sp.tipe[0] : sp.tipe;
  const tipe = raw && Object.hasOwn(TIPE, raw) ? raw : undefined;

  const [cities, featured, { waDefault }] = await Promise.all([
    getCityBoard(tipe ? TIPE[tipe] : undefined),
    getFeatured(),
    getSiteSettings(),
  ]);
  const mobileMore = cities.length - 4;
  const desktopMore = cities.length - 5;

  return (
    <div className="wrap">
      <section className={s.hero}>
        <div className={s.hello}>
          <h1>
            Yuk, dolan! Nginepnya biar <mark>hemat</mark>, jalan‑jalannya puas.
          </h1>
          <p>Bandingkan hotel, penginapan, dan villa murah per kota, lalu pesan lewat link resmi atau tanya via WhatsApp.</p>
          <TypeSegment active={tipe} />
        </div>
        <div>
          <div className={s.board}>
            {cities.slice(0, 5).map((c) => (
              <CityTile key={c.id} city={c} />
            ))}
            <MoreCitiesTile n={desktopMore} className={s.desktopOnly} />
          </div>
          {mobileMore > 0 && (
            <Link href="/kota" className={s.more}>
              Lihat {mobileMore} kota lainnya <IconArrowRight size={18} stroke={1.75} aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>

      {featured.length > 0 && (
        <section className={s.promo}>
          <div className={s.promoHd}>
            <h2>Promo minggu ini</h2>
            <Link href="/promo" className={s.all}>
              Semua promo
            </Link>
          </div>
          <div className={s.deals}>
            {featured.map((l) => (
              <ListingCard key={l.id} data={l} variant="card" />
            ))}
          </div>
        </section>
      )}

      <WaBlock waDefault={waDefault} />
    </div>
  );
}
