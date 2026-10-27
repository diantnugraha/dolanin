"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBuilding,
  IconChartLine,
  IconExternalLink,
  IconLogout,
  IconMapPin,
  IconSettings,
} from "@tabler/icons-react";
import { logout } from "@/app/admin/actions";
import s from "./admin.module.css";

const items = [
  { href: "/admin", label: "Dashboard", Icon: IconChartLine },
  { href: "/admin/listing", label: "Listing", Icon: IconBuilding },
  { href: "/admin/kota", label: "Kota", Icon: IconMapPin },
  { href: "/admin/pengaturan", label: "Pengaturan", Icon: IconSettings },
];

export function Sidebar() {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  return (
    <nav className={s.sb} aria-label="Menu admin">
      <div className={s.logo}>
        <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 3C14.6 3 7 10.6 7 20c0 12 17 25 17 25s17-13 17-25C41 10.6 33.4 3 24 3Z" fill="#F26B3A" />
          <circle cx="24" cy="20" r="7" fill="#FFC24B" />
          <path d="M14 33q10-6 20 0" stroke="#7FD6D6" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
        <span>
          dolan<span className={s.in}>in</span>
        </span>
        <small>Admin</small>
      </div>
      {items.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={s.item} aria-current={active(href) ? "page" : undefined}>
          <Icon size={19} aria-hidden="true" />
          {label}
        </Link>
      ))}
      <a href="/" target="_blank" rel="noopener" className={s.item}>
        <IconExternalLink size={19} aria-hidden="true" />
        Lihat web
      </a>
      <form action={logout} className={s.logout}>
        <button type="submit" className={s.item}>
          <IconLogout size={19} aria-hidden="true" />
          Keluar
        </button>
      </form>
    </nav>
  );
}
