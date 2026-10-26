import { IconBrandWhatsapp, IconExternalLink, IconInfoCircle } from "@tabler/icons-react";
import { isPromo } from "@/lib/listing";
import { PriceTag } from "./PriceTag";
import { PromoStamp } from "./PromoStamp";
import s from "./BookingCard.module.css";

export function BookingCard({
  id, price, normalPrice, showWa,
}: { id: string; price: number; normalPrice: number | null; showWa: boolean }) {
  return (
    <aside className={s.book} aria-label="Pemesanan">
      <div className={s.top}>
        <PriceTag price={price} normalPrice={normalPrice} size="lg" perNight />
        {isPromo({ price, normalPrice }) && <PromoStamp />}
      </div>
      <a className={s.go} href={`/go/${id}/pesan`} target="_blank" rel="noopener nofollow">
        Pesan sekarang <IconExternalLink size={18} stroke={1.75} aria-hidden="true" />
      </a>
      {showWa && (
        <a className={s.wa} href={`/go/${id}/wa`} target="_blank" rel="noopener nofollow">
          <IconBrandWhatsapp size={20} stroke={1.75} aria-hidden="true" />
          Tanya via WhatsApp
        </a>
      )}
      <p className={s.note}>
        <IconInfoCircle size={16} stroke={1.75} aria-hidden="true" />
        Pemesanan diproses di situs partner resmi. Harga bisa berubah sewaktu-waktu.
      </p>
    </aside>
  );
}
