import { IconBrandWhatsapp, IconExternalLink } from "@tabler/icons-react";
import { formatRupiah } from "@/lib/format";
import s from "./ActionDock.module.css";

export function ActionDock({ id, price, showWa }: { id: string; price: number; showWa: boolean }) {
  return (
    <div className={s.dock} data-dock>
      <div className={s.p}>
        <small>mulai dari</small>
        <div className={s.price}>{formatRupiah(price)}</div>
      </div>
      {showWa && (
        <a className={s.wa} href={`/go/${id}/wa`} target="_blank" rel="noopener nofollow" aria-label="Chat WhatsApp">
          <IconBrandWhatsapp size={22} stroke={1.75} aria-hidden="true" />
        </a>
      )}
      <a className={s.go} href={`/go/${id}/pesan`} target="_blank" rel="noopener nofollow">
        Pesan <IconExternalLink size={16} stroke={1.75} aria-hidden="true" />
      </a>
    </div>
  );
}
