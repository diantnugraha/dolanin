import Link from "next/link";
import { IconMapPin } from "@tabler/icons-react";
import type { ListingCardData } from "@/lib/catalog";
import { isPromo } from "@/lib/listing";
import { CoverImage } from "./Media";
import { PriceTag } from "./PriceTag";
import { PromoStamp } from "./PromoStamp";
import { TypeTag } from "./TypeTag";
import s from "./ListingCard.module.css";

export function ListingCard({ data, variant }: { data: ListingCardData; variant: "row" | "card" | "auto" }) {
  const isRow = variant === "row";
  return (
    <Link href={`/${data.citySlug}/${data.slug}`} className={`${s.item} ${s[variant]}`}
      data-price={data.price}>
      <div className={s.th}>
        <CoverImage
          cover={data.cover}
          sizes={variant === "card" ? "(min-width: 1024px) 280px, 220px" : variant === "auto" ? "(min-width: 1024px) 280px, 112px" : "112px"}
        />
        {isPromo(data) && <PromoStamp />}
      </div>
      <div className={s.bd}>
        <TypeTag type={data.type} />
        <div className={s.name}>{data.name}</div>
        <div className={s.where}>
          <IconMapPin size={14} stroke={1.5} aria-hidden="true" />
          {isRow ? data.area : `${data.area}, ${data.cityName}`}
        </div>
        <div className={s.price}>
          <PriceTag price={data.price} normalPrice={data.normalPrice} perNight={!isRow} />
        </div>
      </div>
    </Link>
  );
}
