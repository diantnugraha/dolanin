"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { Logo } from "@/components/site/Logo";
import s from "@/components/site/StatusPage.module.css";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className={s.box}>
      <div className={s.mark}>
        <Logo />
      </div>
      <h1>Ada yang salah.</h1>
      <p>Coba muat ulang halaman.</p>
      <button type="button" className={s.cta} onClick={() => retry()}>
        <IconRefresh size={20} stroke={1.75} aria-hidden="true" />
        Muat ulang
      </button>
    </main>
  );
}
