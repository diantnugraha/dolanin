import { IconExternalLink, IconMapPin, IconPlayerPlayFilled } from "@tabler/icons-react";
import type { ListingDetail } from "@/lib/catalog";
import { isPromo } from "@/lib/listing";
import { Facilities } from "./Facilities";
import { CoverImage } from "./Media";
import { PriceTag } from "./PriceTag";
import { PromoStamp } from "./PromoStamp";
import { ShareButton } from "./ShareButton";
import { TypeTag } from "./TypeTag";
import s from "./DetailInfo.module.css";

export function DetailInfo({ l }: { l: ListingDetail }) {
  return (
    <div className={s.info}>
      <header className={s.head}>
        <div className={s.titles}>
          <TypeTag type={l.type} />
          <h1>{l.name}</h1>
          <div className={s.where}>
            <IconMapPin size={14} stroke={1.5} aria-hidden="true" />
            {l.area}, {l.cityName}
          </div>
        </div>
        <ShareButton title={l.name} />
      </header>

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

      {l.media.length > 0 && (
        <section className={s.sec}>
          <h2>Foto &amp; video</h2>
          <ul className={s.grid}>
            {l.media.map((m, i) => (
              <li key={m.kind === "PHOTO" ? m.key : m.guid} className={s.cell}>
                <CoverImage
                  cover={m.kind === "PHOTO" ? { kind: "PHOTO", key: m.key } : { kind: "VIDEO", guid: m.guid }}
                  sizes="(min-width: 1024px) 200px, 33vw"
                  alt={`${l.name}, ${m.kind === "VIDEO" ? "video" : "foto"} ${i + 1}`}
                />
                {m.kind === "VIDEO" && (
                  <span className={s.play} aria-hidden="true">
                    <IconPlayerPlayFilled size={16} />
                  </span>
                )}
              </li>
            ))}
          </ul>
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
