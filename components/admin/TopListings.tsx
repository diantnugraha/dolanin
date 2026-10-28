import { CoverImage } from "@/components/site/Media";
import { channelById } from "@/lib/channels";
import { formatCount, formatPercent } from "@/lib/format";
import type { getTopListings } from "@/lib/stats";
import s from "./dashboard.module.css";

export function TopListings({ rows }: { rows: Awaited<ReturnType<typeof getTopListings>> }) {
  if (!rows.length) return <p className={s.empty}>Belum ada data untuk periode ini.</p>;
  const max = Math.max(1, ...rows.map((r) => r.clicks));
  return (
    <div className={s.scroll}>
      <table className={s.tbl}>
        <thead>
          <tr><th>Listing</th><th>Kunjungan</th><th className={s.l}>Klik</th><th>Channel teratas</th><th>Rasio klik</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const top = r.topChannel && channelById(r.topChannel);
            return (
              <tr key={r.id}>
                <td>
                  <div className={s.it}>
                    <div className={s.thumb}><CoverImage cover={r.cover} sizes="36px" /></div>
                    <div><b>{r.name}</b><small>{r.cityName}</small></div>
                  </div>
                </td>
                <td>{formatCount(r.views)}</td>
                <td className={s.l}>
                  <div className={s.ib}>
                    <div className={s.tr}><i style={{ width: `${(r.clicks / max) * 100}%` }} /></div>
                    <b>{formatCount(r.clicks)}</b>
                  </div>
                </td>
                <td>
                  {top ? (
                    <span className={s.ch}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- 16px static icon */}
                      <img src={`/channels/icon-${top.slug}.png`} alt="" width={16} height={16} />
                      {top.label}
                    </span>
                  ) : (
                    "–"
                  )}
                </td>
                <td>{formatPercent(r.ratio)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
