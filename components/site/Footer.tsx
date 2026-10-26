import { Logo } from "./Logo";
import s from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={s.foot}>
      <div className={`wrap ${s.inner}`}>
        <Logo size={24} />
        <span>Pemesanan diproses di situs partner resmi. Harga dapat berubah sewaktu-waktu.</span>
        <span>© {new Date().getFullYear()} Dolanin</span>
      </div>
    </footer>
  );
}
