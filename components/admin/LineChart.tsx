"use client";

import { useEffect, useRef, useState } from "react";
import { IconTable } from "@tabler/icons-react";
import { formatDay } from "@/lib/format";
import s from "./dashboard.module.css";

const PESAN = "#F26B3A";
const WA = "#00918F";
const H = 250, L = 32, R = 12, T = 10, B = 30;
const PH = H - T - B;

type Day = { date: string; pesan: number; wa: number };

/** Round the axis top up to a multiple of 4 so all four gridlines land on whole numbers. */
function axisMax(max: number) {
  return Math.max(4, Math.ceil(max / 4) * 4);
}

export function LineChart({ series, label }: { series: Day[]; label: string }) {
  const n = series.length;
  // Drawn 1:1 in CSS pixels (viewBox width = container width) so axis labels stay 11px at any width.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(240, Math.round(el.clientWidth))));
    ro.observe(el);
    setW(Math.max(240, Math.round(el.clientWidth)));
    return () => ro.disconnect();
  }, []);
  const PW = W - L - R;
  const ymax = axisMax(Math.max(0, ...series.map((r) => Math.max(r.pesan, r.wa))));
  const x = (i: number) => (n > 1 ? L + (PW * i) / (n - 1) : L);
  const y = (v: number) => T + PH * (1 - v / ymax);
  const path = (k: "pesan" | "wa") =>
    series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(" ");
  const ticks = [0, 1, 2, 3, 4].map((t) => (ymax * t) / 4).filter((v, i, a) => a.indexOf(v) === i);
  const xIdx = [...new Set(n <= 8 ? series.map((_, i) => i) : [0, 1, 2, 3, 4].map((k) => Math.round(((n - 1) * k) / 4)))];

  const [active, setActive] = useState<number | null>(null);
  const cur = active === null ? null : series[active];
  const flip = active !== null && active > (n - 1) * 0.65;

  return (
    <>
      <div className={s.chart} ref={box}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        height={H}
        role="img"
        aria-label={label}
        tabIndex={0}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const vx = ((e.clientX - r.left) / r.width) * W;
          setActive(Math.max(0, Math.min(n - 1, Math.round(((vx - L) / PW) * (n - 1)))));
        }}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const from = active ?? n - 1;
          setActive(Math.max(0, Math.min(n - 1, from + (e.key === "ArrowLeft" ? -1 : 1))));
        }}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#EEEAE4" strokeWidth={1} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#6B7280" fontFamily="Poppins, sans-serif">{v}</text>
          </g>
        ))}
        {xIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={11} fill="#6B7280" fontFamily="Poppins, sans-serif">
            {formatDay(series[i].date)}
          </text>
        ))}
        <path d={`${path("pesan")} L${x(n - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill={PESAN} fillOpacity={0.08} />
        <path d={path("wa")} fill="none" stroke={WA} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={path("pesan")} fill="none" stroke={PESAN} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(n - 1)} cy={y(series[n - 1].pesan)} r={4} fill={PESAN} stroke="#fff" strokeWidth={2} />
        <circle cx={x(n - 1)} cy={y(series[n - 1].wa)} r={4} fill={WA} stroke="#fff" strokeWidth={2} />
        {cur && active !== null && (
          <>
            <line x1={x(active)} x2={x(active)} y1={T} y2={T + PH} stroke="#9AA0A8" strokeWidth={1} />
            <circle cx={x(active)} cy={y(cur.pesan)} r={4.5} fill={PESAN} stroke="#fff" strokeWidth={2} />
            <circle cx={x(active)} cy={y(cur.wa)} r={4.5} fill={WA} stroke="#fff" strokeWidth={2} />
          </>
        )}
      </svg>
      <div className={s.tt} role="tooltip" style={{ left: `${active === null ? 0 : (x(active) / W) * 100}%`, top: 8, opacity: cur ? 1 : 0, transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}>
        {cur && (
          <>
            <div className={s.d}>{formatDay(cur.date, true)}</div>
            <div className={s.r}><i style={{ background: PESAN }} /><b>{cur.pesan}</b><span>Pesan</span></div>
            <div className={s.r}><i style={{ background: WA }} /><b>{cur.wa}</b><span>Chat WA</span></div>
          </>
        )}
      </div>
      </div>
      <details className={s.tview}>
        <summary><IconTable size={15} aria-hidden="true" />Lihat sebagai tabel</summary>
        <table>
          <thead><tr><th>Tanggal</th><th>Pesan</th><th>Chat WA</th></tr></thead>
          <tbody>
            {series.map((r) => (
              <tr key={r.date}><td>{formatDay(r.date)}</td><td>{r.pesan}</td><td>{r.wa}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
