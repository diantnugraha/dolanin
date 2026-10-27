import Link from "next/link";
import { IconArrowsSort, IconChevronDown, IconMapPin } from "@tabler/icons-react";
import type { CatalogParams } from "@/lib/listing";
import { FilterPanel } from "./FilterPanel";
import { FilterSheet } from "./FilterSheet";
import type { HrefFor } from "./FilterPanel";
import s from "./CatalogView.module.css";

type PanelProps = React.ComponentProps<typeof FilterPanel>;

/** Mobile chip row: sort toggle link + chips that open the filter sheet. */
export function FilterBar({ params, hrefFor, cityName, panel }: { params: CatalogParams; hrefFor: HrefFor; cityName?: string; panel: PanelProps }) {
  const priceOn = params.preset !== undefined || params.min !== undefined || params.max !== undefined;
  const chips = [
    ...(cityName ? [{ label: cityName, icon: <IconMapPin size={16} stroke={1.75} aria-hidden="true" />, on: true }] : []),
    { label: "Harga", icon: undefined, on: priceOn },
    { label: "Tipe", icon: undefined, on: params.types.length > 0 },
  ];
  return (
    <>
    <div className={s.filters}>
      <div className={s.chips}>
        <Link href={hrefFor({ sort: params.sort === "asc" ? "desc" : "asc" })} className={`${s.chip} ${s.chipSort}`}>
          <IconArrowsSort size={16} stroke={1.75} aria-hidden="true" />
          {params.sort === "asc" ? "Termurah" : "Termahal"}
        </Link>
        <FilterSheet chips={chips.map((c) => ({ ...c, icon: c.icon ?? <IconChevronDown size={16} stroke={1.75} aria-hidden="true" /> }))}>
          <FilterPanel {...panel} />
        </FilterSheet>
      </div>
    </div>
    <noscript>
      <div className={s.inline}>
        <FilterPanel {...panel} />
      </div>
    </noscript>
    </>
  );
}
