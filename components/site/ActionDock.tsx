import type { BookingChannel } from "../../generated/prisma/client";
import { formatRupiah } from "@/lib/format";
import { ChannelTiles } from "./ChannelTiles";
import s from "./ActionDock.module.css";

export function ActionDock({ id, price, channels }: { id: string; price: number; channels: BookingChannel[] }) {
  return (
    <div className={s.dock} data-dock>
      <div className={s.top}>
        <small>{channels.length ? "Pesan di" : "mulai dari"}</small>
        <div className={s.price}>
          {formatRupiah(price)} <small>/malam</small>
        </div>
      </div>
      <ChannelTiles id={id} channels={channels} variant="dock" />
    </div>
  );
}
