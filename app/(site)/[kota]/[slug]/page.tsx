import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionDock } from "@/components/site/ActionDock";
import { BookingCard } from "@/components/site/BookingCard";
import { DetailInfo } from "@/components/site/DetailInfo";
import { CoverImage } from "@/components/site/Media";
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
  return (
    <div className={s.page}>
      <ViewBeacon id={l.id} />
      <div className={s.cols}>
        <div className={s.main}>
          {/* Task 8 replaces this static cover with the media hero. */}
          <div className={s.hero} data-slot="hero">
            <CoverImage cover={l.cover} sizes="(min-width: 1024px) 800px, 100vw" alt={l.name} />
          </div>
          <DetailInfo l={l} />
        </div>
        <div className={s.side}>
          <BookingCard id={l.id} price={l.price} normalPrice={l.normalPrice} showWa={showWa} />
        </div>
      </div>
      <ActionDock id={l.id} price={l.price} showWa={showWa} />
    </div>
  );
}
