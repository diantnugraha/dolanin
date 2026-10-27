import Link from "next/link";
import { IconHome, IconMapPinOff } from "@tabler/icons-react";
import s from "./StatusPage.module.css";

/** 404 body. The site layout (or the root not-found) supplies the header and footer around it. */
export function NotFoundBody() {
  return (
    <div className={s.box}>
      <IconMapPinOff size={48} stroke={1.5} className={s.icon} aria-hidden="true" />
      <h1>Halaman tidak ditemukan</h1>
      <p>Mungkin listingnya sudah tidak tayang atau tautannya berubah.</p>
      <Link href="/" className={s.cta}>
        <IconHome size={20} stroke={1.75} aria-hidden="true" />
        Kembali ke Beranda
      </Link>
    </div>
  );
}
