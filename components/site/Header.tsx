import { IconBrandWhatsapp, IconSearch } from "@tabler/icons-react";
import { GENERAL_WA_TEXT, waLink } from "@/lib/wa";
import { Logo } from "./Logo";
import { SearchDialog } from "./SearchDialog";
import s from "./Header.module.css";

export function Header({ waDefault }: { waDefault: string | null }) {
  return (
    <header className={s.nav}>
      <div className={`wrap ${s.inner}`}>
        <Logo />
        <form method="get" action="/cari" className={s.search} role="search">
          <IconSearch size={20} stroke={1.5} aria-hidden="true" />
          <input type="search" name="q" placeholder="Cari kota atau nama penginapan" aria-label="Cari kota atau nama penginapan" />
        </form>
        <SearchDialog />
        {waDefault && (
          <a className={s.wa} href={waLink(waDefault, GENERAL_WA_TEXT)} target="_blank" rel="noopener noreferrer" aria-label="Tanya via WA">
            <IconBrandWhatsapp size={20} stroke={1.75} aria-hidden="true" />
            <span className={s.waText}>Tanya via WA</span>
          </a>
        )}
      </div>
    </header>
  );
}
