import { TYPE_LABEL } from "@/lib/listing";
import type { StatsFilter } from "@/lib/stats";
import d from "./dashboard.module.css";

const RANGES = [7, 30, 90] as const;

export function StatsFilters({
  filter,
  cities,
  rangeLabel,
}: {
  filter: Pick<StatsFilter, "days" | "cityId" | "type">;
  cities: { id: string; name: string }[];
  rangeLabel: string;
}) {
  return (
    <form method="get" action="/admin" className={d.filters}>
      <div className={d.seg} role="radiogroup" aria-label="Rentang waktu">
        {RANGES.map((r) => (
          <label key={r}>
            <input type="radio" name="rentang" value={r} defaultChecked={filter.days === r} />
            <span>{r} hari</span>
          </label>
        ))}
      </div>
      <select name="kota" className={d.sel} aria-label="Kota" defaultValue={filter.cityId ?? ""}>
        <option value="">Semua kota</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select name="tipe" className={d.sel} aria-label="Tipe" defaultValue={filter.type ?? ""}>
        <option value="">Semua tipe</option>
        {Object.entries(TYPE_LABEL).map(([k, v]) => (
          <option key={k} value={k.toLowerCase()}>{v}</option>
        ))}
      </select>
      <button type="submit" className={d.apply}>Terapkan</button>
      <span className={d.range} data-testid="range-label">{rangeLabel}</span>
    </form>
  );
}
