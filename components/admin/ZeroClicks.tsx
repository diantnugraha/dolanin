import Link from "next/link";
import { IconBulb } from "@tabler/icons-react";
import { CoverImage } from "@/components/site/Media";
import { formatCount } from "@/lib/format";
import type { getZeroClickListings } from "@/lib/stats";
import s from "./dashboard.module.css";

export function ZeroClicks({ rows }: { rows: Awaited<ReturnType<typeof getZeroClickListings>> }) {
  return (
    <>
      {rows.length === 0 ? (
        <p className={s.empty}>Belum ada data untuk periode ini.</p>
      ) : (
        <ul className={s.zero}>
          {rows.map((r) => (
            <li key={r.id}>
              <div className={`${s.thumb} ${s.thumbL}`}><CoverImage cover={r.cover} sizes="40px" /></div>
              <div><b>{r.name}</b><small>{r.cityName} · {formatCount(r.views)} kunjungan</small></div>
              <Link href={`/admin/listing/${r.id}`} aria-label={`Ubah ${r.name}`}>Ubah</Link>
            </li>
          ))}
        </ul>
      )}
      <p className={s.tip}>
        <IconBulb size={16} aria-hidden="true" />
        Banyak dikunjungi tapi tidak diklik biasanya berarti harganya kalah bersaing atau foto pembukanya kurang menarik.
      </p>
    </>
  );
}
