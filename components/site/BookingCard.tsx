import { IconInfoCircle } from "@tabler/icons-react";
import type { BookingChannel } from "../../generated/prisma/client";
import { isPromo } from "@/lib/listing";
import { ChannelTiles } from "./ChannelTiles";
import { PriceTag } from "./PriceTag";
import { PromoStamp } from "./PromoStamp";
import s from "./BookingCard.module.css";

export function BookingCard({
  id, price, normalPrice, channels,
}: { id: string; price: number; normalPrice: number | null; channels: BookingChannel[] }) {
  return (
    <aside className={s.book} aria-label="Pemesanan">
      <div className={s.top}>
        <PriceTag price={price} normalPrice={normalPrice} size="lg" perNight />
        {isPromo({ price, normalPrice }) && <PromoStamp />}
      </div>
      {channels.length > 0 && (
        <>
          <h2 className={s.h}>Pesan di</h2>
          <ChannelTiles id={id} channels={channels} variant="card" />
        </>
      )}
      <p className={s.note}>
        <IconInfoCircle size={16} stroke={1.75} aria-hidden="true" />
        Pemesanan diproses di situs partner resmi. Harga bisa berubah sewaktu-waktu.
      </p>
    </aside>
  );
}
