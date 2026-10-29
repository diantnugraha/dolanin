import { IconArrowUpRight } from "@tabler/icons-react";
import type { BookingChannel } from "../../generated/prisma/client";
import { channelById, linkName } from "@/lib/channels";
import s from "./ChannelTiles.module.css";

/**
 * One logo tile per booking link the listing has, in channel order.
 * `dock` (phone): 1–3 tiles share the width, more scroll sideways. `card` (desktop): stacked rows with an arrow.
 */
export function ChannelTiles({ id, channels, variant }: { id: string; channels: BookingChannel[]; variant: "dock" | "card" }) {
  if (!channels.length) return null;
  const cls = [s.tiles, s[variant], variant === "dock" && channels.length > 3 && s.scroll, channels.length === 1 && s.one]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} role="group" aria-label="Pesan di">
      {channels.map((ch) => {
        const c = channelById(ch);
        return (
          <a key={ch} className={s.t} href={`/go/${id}/${c.slug}`} target="_blank" rel="noopener nofollow" aria-label={linkName(ch)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- small static brand logo, fixed tile height */}
            <img className={`${s.lg} ${s[c.slug] ?? ""}`} src={`/channels/${c.slug}.png`} alt="" />
            {variant === "card" && <IconArrowUpRight className={s.arr} size={18} stroke={1.75} aria-hidden="true" />}
          </a>
        );
      })}
    </div>
  );
}
