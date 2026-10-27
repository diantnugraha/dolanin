import Link from "next/link";
import s from "./Logo.module.css";

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <Link href="/" className={s.logo} aria-label="Dolanin, beranda">
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 3C14.6 3 7 10.6 7 20c0 12 17 25 17 25s17-13 17-25C41 10.6 33.4 3 24 3Z" fill="#F26B3A" />
        <circle cx="24" cy="20" r="7" fill="#FFC24B" />
        <path d="M14 33q10-6 20 0" stroke="#0E8C8C" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <span>
        dolan<span className={s.in}>in</span>
      </span>
    </Link>
  );
}
