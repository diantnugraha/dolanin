import { FilterPanel } from "./FilterPanel";
import s from "./CatalogView.module.css";

export function FilterSidebar(props: React.ComponentProps<typeof FilterPanel>) {
  return (
    <aside className={s.side} aria-label="Filter">
      <FilterPanel {...props} />
    </aside>
  );
}
