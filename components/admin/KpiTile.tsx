import { IconArrowDownRight, IconArrowUpRight, IconMinus } from "@tabler/icons-react";
import { formatPercent } from "@/lib/format";
import d from "./dashboard.module.css";

export function KpiTile({
  id, label, value, delta, deltaSuffix, note, keyColor, hero,
}: {
  id: string;
  label: string;
  value: string;
  delta?: number | null;
  deltaSuffix?: string;
  note?: string;
  keyColor?: string;
  hero?: boolean;
}) {
  const showDelta = delta !== undefined && delta !== null;
  const Icon = !showDelta || delta === 0 ? IconMinus : delta > 0 ? IconArrowUpRight : IconArrowDownRight;
  return (
    <div className={`${d.tile} ${hero ? d.hero : ""}`} data-testid={`kpi-${id}`}>
      <span className={d.lb}>
        {keyColor && <i className={d.key} style={{ background: keyColor }} />}
        {label}
      </span>
      <span className={d.v} data-kpi={id}>{value}</span>
      {showDelta && (
        <span data-testid="delta" className={`${d.delta} ${delta <= 0 ? d.flat : ""}`}>
          <Icon size={14} aria-hidden="true" />
          {formatPercent(Math.abs(delta))}
          {deltaSuffix ? ` ${deltaSuffix}` : ""}
          <span className="sr-only">{delta === 0 ? " tidak berubah" : delta < 0 ? " turun" : " naik"}</span>
        </span>
      )}
      {note && <small>{note}</small>}
    </div>
  );
}
