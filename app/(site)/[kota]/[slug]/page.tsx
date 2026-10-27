import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionDock } from "@/components/site/ActionDock";
import { BookingCard } from "@/components/site/BookingCard";
import { DetailHead, DetailInfo } from "@/components/site/DetailInfo";
import { MediaHero } from "@/components/site/MediaHero";
import { MediaMosaic } from "@/components/site/MediaMosaic";
import { MediaViewerProvider } from "@/components/site/MediaViewer";
import { ViewBeacon } from "@/components/site/ViewBeacon";
import { getListingDetail, getSiteSettings } from "@/lib/catalog";
import { photoUrl, videoPoster } from "@/lib/media";
import s from "./page.module.css";

type Props = { params: Promise<{ kota: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kota, slug } = await params;
  const l = await getListingDetail(kota, slug);
  if (!l) return { title: "Dolanin" };
  const c = l.cover;
  const image = c ? (c.kind === "PHOTO" ? photoUrl(c.key, 1600) : videoPoster(c.guid)) : undefined;
  return {
    title: `${l.name} – ${l.cityName} | Dolanin`,
    description: l.description,
    openGraph: { title: `${l.name} – ${l.cityName}`, description: l.description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function ListingPage({ params }: Props) {
  const { kota, slug } = await params;
  const [l, settings] = await Promise.all([getListingDetail(kota, slug), getSiteSettings()]);
  if (!l) notFound();
  const showWa = (l.waNumber ?? settings.waDefault) !== null;
  // One dock: pinned under the page on phones, and again inside the fullscreen viewer.
  const dock = <ActionDock id={l.id} price={l.price} showWa={showWa} />;
  return (
    <div className={s.page}>
      <ViewBeacon id={l.id} />
      <MediaViewerProvider media={l.media} name={l.name} dockSlot={dock}>
        <div className={s.layout} data-hero={l.media[0]?.kind ?? "NONE"}>
          <nav className={s.crumb} aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${l.citySlug}`}>{l.cityName}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{l.name}</span>
          </nav>
          <MediaHero media={l.media} name={l.name} backHref={`/${l.citySlug}`} />
          <MediaMosaic media={l.media} name={l.name} />
          <div className={s.sheet}>
            <DetailHead l={l} />
            <DetailInfo l={l} />
          </div>
          <div className={s.side}>
            <BookingCard id={l.id} price={l.price} normalPrice={l.normalPrice} showWa={showWa} />
          </div>
        </div>
      </MediaViewerProvider>
      {dock}
    </div>
  );
}
