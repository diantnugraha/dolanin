import { IconExternalLink, IconMapPin, IconPlayerPlayFilled } from "@tabler/icons-react";
import type { ListingDetail } from "@/lib/catalog";
import { formatDuration } from "@/lib/format";
import { isPromo, mediaLabel } from "@/lib/listing";
import { Facilities } from "./Facilities";
import { CoverImage } from "./Media";
import { MediaOpen } from "./MediaViewer";
import { PriceTag } from "./PriceTag";
import { PromoStamp } from "./PromoStamp";
import { ShareButton } from "./ShareButton";
import { TypeTag } from "./TypeTag";
import s from "./DetailInfo.module.css";

/** Type, name, area. Top of the info sheet on phones, the title row above the mosaic on desktop. */
export function DetailHead({ l }: { l: ListingDetail }) {
  return (
    <header className={s.head}>
      <div className={s.titles}>
        <TypeTag type={l.type} />
        <h1>{l.name}</h1>
        <div className={s.where}>
          <IconMapPin size={14} stroke={1.5} aria-hidden="true" />
          {l.area}, {l.cityName}
        </div>
      </div>
      {/* Phones share from the media hero. */}
      <div className={s.share}>
        <ShareButton title={l.name} />
      </div>
    </header>
  );
}

const GRID_MAX = 4;

export function DetailInfo({ l }: { l: ListingDetail }) {
  const rest = l.media.length - GRID_MAX;
  return (
    <div className={s.info}>
      {/* Mobile price box; desktop shows the price in BookingCard. */}
      <div className={s.pricebox}>
        <PriceTag price={l.price} normalPrice={l.normalPrice} size="lg" perNight />
        {isPromo(l) && <PromoStamp />}
      </div>

      <section className={s.curate}>
        <h2>Kenapa kami pilih ini</h2>
        <p>{l.description}</p>
        <div className={s.by}>
          <i>
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M24 3C14.6 3 7 10.6 7 20c0 12 17 25 17 25s17-13 17-25C41 10.6 33.4 3 24 3Z" fill="#FFF6EC" />
              <circle cx="24" cy="20" r="7" fill="#FFC24B" />
            </svg>
          </i>
          Dipilih tim Dolanin
        </div>
      </section>

      {/* Phones only: desktop shows the mosaic. Each tile opens the viewer at its index. */}
      {l.media.length > 0 && (
        <section className={`${s.sec} ${s.mediaSec}`}>
          <div className={s.secHead}>
            <h2>Foto &amp; video</h2>
            <MediaOpen index={0} className={s.all}>Lihat semua</MediaOpen>
          </div>
          <div className={s.grid}>
            {l.media.slice(0, GRID_MAX).map((m, i) => (
              <MediaOpen
                key={m.kind === "PHOTO" ? m.key : m.guid}
                index={i}
                className={m.kind === "VIDEO" ? `${s.cell} ${s.v}` : s.cell}
                label={mediaLabel(m, i, l.media.length)}
              >
                <CoverImage
                  cover={m.kind === "PHOTO" ? { kind: "PHOTO", key: m.key } : { kind: "VIDEO", guid: m.guid }}
                  sizes="33vw"
                  alt=""
                />
                {m.kind === "VIDEO" && (
                  <span className={s.dur} aria-hidden="true">
                    <IconPlayerPlayFilled size={14} />
                    {m.durationSec ? formatDuration(m.durationSec) : "Video"}
                  </span>
                )}
              </MediaOpen>
            ))}
            {rest > 0 && (
              <MediaOpen index={GRID_MAX} className={s.more}>
                +{rest} {l.media.slice(GRID_MAX).every((m) => m.kind === "PHOTO") ? "foto" : "media"}
              </MediaOpen>
            )}
          </div>
        </section>
      )}

      <Facilities keys={l.facilities} extra={l.extraFacilities} />

      <section className={s.sec}>
        <h2>Lokasi</h2>
        <p className={s.loc}>
          {l.area}, {l.cityName}
        </p>
        {l.mapsUrl && (
          <a className={s.maps} href={l.mapsUrl} target="_blank" rel="noopener noreferrer">
            Buka di Google Maps <IconExternalLink size={16} stroke={1.75} aria-hidden="true" />
          </a>
        )}
      </section>
    </div>
  );
}
