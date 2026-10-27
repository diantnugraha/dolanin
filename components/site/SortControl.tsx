import Link from "next/link";
import { IconArrowsSort } from "@tabler/icons-react";
import type { CatalogParams } from "@/lib/listing";
import type { HrefFor } from "./FilterPanel";
import s from "./CatalogView.module.css";

/** Two plain links; the active one is highlighted. */
export function SortControl({ params, hrefFor }: { params: CatalogParams; hrefFor: HrefFor }) {
  return (
    <nav className={s.sort} aria-label="Urutan">
      <IconArrowsSort size={18} stroke={1.75} aria-hidden="true" />
      <Link href={hrefFor({ sort: "asc" })} className={params.sort === "asc" ? s.sortOn : undefined} aria-current={params.sort === "asc" ? "true" : undefined}>
        Harga termurah
      </Link>
      <Link href={hrefFor({ sort: "desc" })} className={params.sort === "desc" ? s.sortOn : undefined} aria-current={params.sort === "desc" ? "true" : undefined}>
        Harga termahal
      </Link>
    </nav>
  );
}
