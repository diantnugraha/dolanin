import Link from "next/link";
import s from "./TypeSegment.module.css";

const ITEMS = [
  { label: "Semua", value: undefined, href: "/" },
  { label: "Hotel", value: "hotel", href: "/?tipe=hotel" },
  { label: "Penginapan", value: "penginapan", href: "/?tipe=penginapan" },
  { label: "Villa", value: "villa", href: "/?tipe=villa" },
] as const;

/** Plain links, so type filtering works without JS. */
export function TypeSegment({ active }: { active?: string }) {
  return (
    <nav className={s.seg} aria-label="Tipe penginapan">
      {ITEMS.map((i) => (
        <Link key={i.label} href={i.href} className={i.value === active ? s.on : undefined} aria-current={i.value === active ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
