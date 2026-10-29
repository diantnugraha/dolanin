"use client";

import { useState } from "react";
import { formatCount, formatPercent } from "@/lib/format";
import s from "./dashboard.module.css";

/** One single-hue bar per row; identity comes from the label (and optional icon), never from colour. */
/** `share` (0–1, of all clicks) is shown next to the count when given; otherwise the tooltip derives it from `total`. */
export type BarRow = { key: string; name: string; count: number; other?: true; icon?: string; share?: number };

export function BarList({ rows, total, unit }: { rows: BarRow[]; total: number; unit: string }) {
  const [tip, setTip] = useState<{ row: BarRow; left: number; top: number } | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const withIcons = rows.some((r) => r.icon); // keeps names aligned when one row ("Lainnya") has no icon
  if (!rows.length) return <p className={s.empty}>Belum ada data untuk periode ini.</p>;
  // Positioned inside the (relative) list so it scrolls with the page and can't leave the card.
  const show = (row: BarRow, el: HTMLElement) => {
    const box = el.parentElement!.clientWidth;
    setTip({ row, left: Math.max(0, Math.min(box * 0.4, box - 150)), top: el.offsetTop + el.offsetHeight + 4 });
  };
  return (
    <>
      <div className={`${s.bars} ${rows.some((r) => r.share !== undefined) ? s.shares : ""}`}>
        {rows.map((r) => (
          <div
            key={r.key}
            className={`${s.bar} ${r.other ? s.other : ""}`}
            tabIndex={0}
            onPointerEnter={(e) => show(r, e.currentTarget)}
            onFocus={(e) => show(r, e.currentTarget)}
            onPointerLeave={() => setTip(null)}
            onBlur={() => setTip(null)}
          >
            <span className={s.nm}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 18px static icon */}
              {r.icon ? <img src={r.icon} alt="" width={18} height={18} /> : withIcons && <span className={s.noic} />}
              {r.name}
            </span>
            <div className={s.tr}><i style={{ width: `${(r.count / max) * 100}%` }} /></div>
            <b>
              {formatCount(r.count)}
              {r.share !== undefined && <small> · {formatPercent(r.share)}</small>}
            </b>
          </div>
        ))}
        <div className={s.tt} role="tooltip" style={{ left: tip?.left ?? 0, top: tip?.top ?? 0, opacity: tip ? 1 : 0 }}>
          {tip && (
            <>
              <div className={s.d}>{tip.row.name}</div>
              <div className={s.r}>
                <i style={{ background: tip.row.other ? "#C9C2B8" : "#F26B3A" }} />
                <b>{formatCount(tip.row.count)}</b>
                <span>
                  {unit}
                  {tip.row.share !== undefined
                    ? ` · ${formatPercent(tip.row.share)}`
                    : total > 0 ? ` · ${Math.round((tip.row.count / total) * 100)}%` : ""}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
