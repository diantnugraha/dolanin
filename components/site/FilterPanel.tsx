import Link from "next/link";
import { IconCheck } from "@tabler/icons-react";
import type { ListingType } from "../../generated/prisma/client";
import { TYPE_LABEL, type CatalogParams, type PricePreset } from "@/lib/listing";
import s from "./Filter.module.css";

export type CityOption = { slug: string; name: string };
export type HrefFor = (patch: Partial<CatalogParams>) => string;

const PRESETS: { value: PricePreset; label: string }[] = [
  { value: "lt150", label: "< Rp150rb" },
  { value: "150-300", label: "Rp150–300rb" },
  { value: "gt300", label: "> Rp300rb" },
];
const TYPES = Object.keys(TYPE_LABEL) as ListingType[];

/** Filter groups as plain links and one GET form, so everything works without JS. */
export function FilterPanel({
  params, hrefFor, cityHref, resetHref, action, hidden, cities, currentCity, typeCounts,
}: {
  params: CatalogParams;
  hrefFor: HrefFor;
  cityHref: (slug: string) => string;
  resetHref: string;
  action: string;
  hidden: Record<string, string>;
  cities?: CityOption[];
  currentCity?: string;
  typeCounts: Record<ListingType, number>;
}) {
  const toggle = (t: ListingType) =>
    params.types.includes(t) ? params.types.filter((x) => x !== t) : [...params.types, t];
  return (
    <div className={s.panel}>
      <div className={s.hd}>
        <b>Filter</b>
        <Link href={resetHref}>Reset</Link>
      </div>
      {cities && cities.length > 0 && (
        <section className={s.grp}>
          <h3>Kota</h3>
          <div className={s.cities}>
            {cities.map((c) => (
              <Link
                key={c.slug}
                href={cityHref(c.slug)}
                className={c.slug === currentCity ? s.on : undefined}
                aria-current={c.slug === currentCity ? "true" : undefined}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className={s.grp}>
        <h3>Tipe</h3>
        {TYPES.map((t) => {
          const on = params.types.includes(t);
          return (
            <Link key={t} href={hrefFor({ types: toggle(t) })} className={s.chk} aria-current={on ? "true" : undefined}>
              <i className={`${s.box} ${on ? s.boxOn : ""}`} aria-hidden="true">
                {on && <IconCheck size={13} stroke={2.5} />}
              </i>
              {TYPE_LABEL[t]}
              <span>{typeCounts[t]}</span>
            </Link>
          );
        })}
      </section>
      <section className={s.grp}>
        <h3>Harga per malam</h3>
        <div className={s.quick}>
          {PRESETS.map((p) => (
            <Link
              key={p.value}
              href={hrefFor(params.preset === p.value ? { preset: undefined } : { preset: p.value, min: undefined, max: undefined })}
              className={params.preset === p.value ? s.on : undefined}
              aria-current={params.preset === p.value ? "true" : undefined}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <form method="get" action={action} className={s.mm}>
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <label>
            <input type="number" inputMode="numeric" name="min" min={0} placeholder="Min Rp" defaultValue={params.min} aria-label="Min" />
          </label>
          <label>
            <input type="number" inputMode="numeric" name="max" min={0} placeholder="Maks Rp" defaultValue={params.max} aria-label="Maks" />
          </label>
          <button type="submit">Terapkan</button>
        </form>
      </section>
    </div>
  );
}
