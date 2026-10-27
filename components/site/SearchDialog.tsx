"use client";

import { useRef } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";
import s from "./Header.module.css";

/** Mobile search: icon button opening a native <dialog> with the same GET form. */
export function SearchDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={`${s.iconBtn} ${s.mobileOnly}`} aria-label="Cari" onClick={() => ref.current?.showModal()}>
        <IconSearch size={20} stroke={1.75} />
      </button>
      <dialog ref={ref} className={s.dialog} aria-label="Cari">
        <form method="get" action="/cari" className={s.dialogForm}>
          <input type="search" name="q" placeholder="Cari kota atau nama penginapan" aria-label="Cari kota atau nama penginapan" required />
          <button type="submit" className={s.go}>Cari</button>
          <button type="button" className={s.iconBtn} aria-label="Tutup" onClick={() => ref.current?.close()}>
            <IconX size={20} stroke={1.75} />
          </button>
        </form>
      </dialog>
    </>
  );
}
