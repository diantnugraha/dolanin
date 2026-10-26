"use client";

import { useState } from "react";
import { formatCount } from "@/lib/format";
import s from "./dashboard.module.css";

type Row = { name: string; count: number; other?: true };

export function CityBars({ rows, total }: { rows: Row[]; total: number }) {
  const [tip, setTip] = useState<{ row: Row; left: number; top: number } | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <p className={s.empty}>Belum ada data untuk periode ini.</p>;
  const show = (row: Row, el: HTMLElement) => {
    const rc = el.getBoundingClientRect();
    setTip({ row, left: rc.left + rc.width * 0.4, top: rc.top - 64 });
  };
  return (
    <>
      <div className={s.bars}>
        {rows.map((r) => (
          <div
            key={r.name}
            className={`${s.bar} ${r.other ? s.other : ""}`}
            tabIndex={0}
            onPointerEnter={(e) => show(r, e.currentTarget)}
            onFocus={(e) => show(r, e.currentTarget)}
            onPointerLeave={() => setTip(null)}
            onBlur={() => setTip(null)}
          >
            <span>{r.name}</span>
            <div className={s.tr}><i style={{ width: `${(r.count / max) * 100}%` }} /></div>
            <b>{formatCount(r.count)}</b>
          </div>
        ))}
      </div>
      <div className={`${s.tt} ${s.ttFixed}`} role="tooltip" style={{ left: tip?.left ?? 0, top: tip?.top ?? 0, opacity: tip ? 1 : 0 }}>
        {tip && (
          <>
            <div className={s.d}>{tip.row.name}</div>
            <div className={s.r}>
              <i style={{ background: tip.row.other ? "#C9C2B8" : "#F26B3A" }} />
              <b>{formatCount(tip.row.count)}</b>
              <span>klik Pesan{total > 0 ? ` · ${Math.round((tip.row.count / total) * 100)}%` : ""}</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
