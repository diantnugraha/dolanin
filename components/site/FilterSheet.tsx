"use client";

import { useRef } from "react";
import { IconX } from "@tabler/icons-react";
import s from "./CatalogView.module.css";

/** Mobile bottom sheet: chips open it, any link inside closes it. */
export function FilterSheet({ children, chips }: { children: React.ReactNode; chips: { label: string; icon?: React.ReactNode; on?: boolean }[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      {chips.map((c) => (
        <button key={c.label} type="button" className={`${s.chip} ${c.on ? s.chipOn : ""}`} onClick={() => ref.current?.showModal()}>
          {c.icon}
          {c.label}
        </button>
      ))}
      <dialog
        ref={ref}
        className={s.sheet}
        aria-label="Filter"
        onClick={(e) => {
          const t = e.target as Element;
          if (t === ref.current || t.closest("a")) ref.current?.close();
        }}
      >
        <button type="button" className={s.sheetClose} aria-label="Tutup" onClick={() => ref.current?.close()}>
          <IconX size={20} stroke={1.75} />
        </button>
        {children}
      </dialog>
    </>
  );
}
