"use client";

import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { IconDots } from "@tabler/icons-react";
import { deleteListingAction } from "./actions";
import s from "./listing.module.css";

/** Disabled while the delete runs, so a double click sends one request. */
function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={s.danger} disabled={pending}>
      Ya, hapus
    </button>
  );
}

export function DeleteMenu({ id, name }: { id: string; name: string }) {
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  function place(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const m = menu.current;
    if (!m) return;
    m.style.top = `${r.bottom + 4}px`;
    m.style.right = `${document.documentElement.clientWidth - r.right}px`;
  }

  return (
    <>
      <button type="button" className={s.ib} popoverTarget={menuId} onClick={place} aria-label={`Menu ${name}`}>
        <IconDots size={17} aria-hidden="true" />
      </button>
      <div id={menuId} ref={menu} popover="auto" role="menu" className={s.menu}>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            menu.current?.hidePopover();
            dialog.current?.showModal();
          }}
        >
          Hapus
        </button>
      </div>
      <dialog ref={dialog} className={s.dialog} aria-labelledby={`${menuId}-t`}>
        <p id={`${menuId}-t`}>Hapus {name}? Foto, video, dan statistiknya ikut terhapus.</p>
        <form action={deleteListingAction.bind(null, id)} className={s.dialogBtns}>
          <button type="button" className={s.cancel} onClick={() => dialog.current?.close()}>
            Batal
          </button>
          <ConfirmButton />
        </form>
      </dialog>
    </>
  );
}
