"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import type { AdminCityRow } from "@/lib/admin";
import { CoverImage } from "@/components/site/Media";
import { deleteCityAction } from "./actions";
import s from "./listing.module.css";

function DeleteCity({ id, name }: { id: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      const r = await deleteCityAction(id);
      setError(r.error);
      if (!r.error) dialog.current?.close();
    } catch {
      setError("Gagal menghapus. Periksa koneksi lalu coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className={s.ib} aria-label={`Hapus ${name}`}
        onClick={() => { setError(null); dialog.current?.showModal(); }}>
        <IconTrash size={17} aria-hidden="true" />
      </button>
      <dialog ref={dialog} className={s.dialog} aria-labelledby={`cd-${id}`}>
        <p id={`cd-${id}`}>Hapus kota {name}?</p>
        {error && <p className={s.dialogErr} role="alert">{error}</p>}
        <div className={s.dialogBtns}>
          <button type="button" className={s.cancel} onClick={() => dialog.current?.close()}>Batal</button>
          <button type="button" className={s.danger} disabled={pending} onClick={confirm}>Ya, hapus</button>
        </div>
      </dialog>
    </>
  );
}

export function CityTable({ rows }: { rows: AdminCityRow[] }) {
  if (rows.length === 0) return <p className={s.empty}>Belum ada kota.</p>;
  return (
    <div className={s.tbl}>
      <table style={{ minWidth: 640 }}>
        <thead>
          <tr>
            <th>Kota</th>
            <th>Kode</th>
            <th>Listing</th>
            <th>Urutan</th>
            <th><span className="sr-only">Aksi</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <div className={s.it}>
                  <span className={s.cityThumb}>
                    <CoverImage cover={r.photoKey ? { kind: "PHOTO", key: r.photoKey } : null} sizes="56px" />
                  </span>
                  <div>
                    <b>{r.name}</b>
                    <small>/{r.slug}</small>
                  </div>
                </div>
              </td>
              <td><span className={s.type}>{r.code}</span></td>
              <td className={s.num}>{r.listingCount}</td>
              <td className={s.num}>{r.sortOrder}</td>
              <td>
                <div className={s.act}>
                  <Link href={`/admin/kota/${r.id}`} className={s.ib} aria-label={`Ubah ${r.name}`}>
                    <IconPencil size={17} aria-hidden="true" />
                  </Link>
                  <DeleteCity id={r.id} name={r.name} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
