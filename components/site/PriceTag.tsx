import { formatRupiah } from "@/lib/format";
import { isPromo } from "@/lib/listing";
import s from "./PriceTag.module.css";

export function PriceTag({
  price,
  normalPrice,
  size = "sm",
  perNight = false,
}: {
  price: number;
  normalPrice: number | null;
  size?: "sm" | "lg";
  perNight?: boolean;
}) {
  return (
    <div className={`${s.wrap} ${size === "lg" ? s.lg : ""}`}>
      {isPromo({ price, normalPrice }) && <span className={s.was}>{formatRupiah(normalPrice!)}</span>}
      <div className={s.price}>
        {formatRupiah(price)}
        {perNight && <small> /malam</small>}
      </div>
    </div>
  );
}
