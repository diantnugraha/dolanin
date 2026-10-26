"use client";

import { useState, useActionState } from "react";
import { unstable_rethrow } from "next/navigation";
import { IconCloudUpload, IconTrash } from "@tabler/icons-react";
import type { AdminCityRow } from "@/lib/admin";
import { CoverImage } from "@/components/site/Media";
import { saveCityAction } from "./actions";
import { uploadPhoto } from "./upload";
import a from "./admin.module.css";
import s from "./form.module.css";

type Errors = Record<string, string>;

export function CityForm({ initial }: { initial?: AdminCityRow }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [photoKey, setPhotoKey] = useState(initial?.photoKey ?? "");
  const [uploading, setUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState("");

  const [errors, submit, pending] = useActionState<Errors, FormData>(async () => {
    try {
      const res = await saveCityAction({ name, code, sortOrder, photoKey }, initial?.id);
      return res.errors;
    } catch (e) {
      unstable_rethrow(e);
      return { form: "Gagal menyimpan. Periksa koneksi lalu coba lagi." };
    }
  }, {});

  async function pick(f: File | undefined) {
    if (!f) return;
    setPhotoErr("");
    setUploading(true);
    try {
      setPhotoKey((await uploadPhoto(f)).key);
    } catch {
      setPhotoErr("Gagal mengunggah foto. Coba lagi.");
    } finally {
      setUploading(false);
    }
  }

  const bad = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `${k}-err` : undefined });
  const fe = (k: string) => errors[k] && <p className={s.err} id={`${k}-err`} role="alert">{errors[k]}</p>;

  return (
    <form action={submit} noValidate className={s.narrow}>
      <section className={s.card}>
        <h2>Info kota</h2>
        <p className={s.hint}>Nama kota jadi alamat halamannya. Mengganti nama mengubah alamat itu.</p>
        <div className={s.f}>
          <label htmlFor="name">Nama kota</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} {...bad("name")} />
          {fe("name")}
        </div>
        <div className={s.row}>
          <div className={s.f}>
            <label htmlFor="code">Kode</label>
            <input id="code" value={code} maxLength={4} onChange={(e) => setCode(e.target.value.toUpperCase())} {...bad("code")} />
            <small>2–4 huruf besar, mis. YK.</small>
            {fe("code")}
          </div>
          <div className={s.f}>
            <label htmlFor="sortOrder">Urutan</label>
            <input id="sortOrder" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} {...bad("sortOrder")} />
            <small>Angka kecil tampil lebih dulu.</small>
            {fe("sortOrder")}
          </div>
        </div>
      </section>

      <section className={s.card}>
        <h2>Foto kota</h2>
        <p className={s.hint}>Tampil di kotak kota pada landing.</p>
        <div className={s.photo}>
          <span className={s.photoBox}>
            <CoverImage cover={photoKey ? { kind: "PHOTO", key: photoKey } : null} sizes="120px" />
          </span>
          <div className={s.photoBtns}>
            <label className={`${a.btn} ${a.ghost}`}>
              <IconCloudUpload size={18} aria-hidden="true" />
              {uploading ? "Mengunggah…" : photoKey ? "Ganti foto" : "Pilih foto"}
              <input type="file" accept="image/*" className="sr-only" aria-label="Pilih foto kota" disabled={uploading}
                onChange={(e) => {
                  void pick(e.target.files?.[0]);
                  e.target.value = "";
                }} />
            </label>
            {photoKey && !uploading && (
              <button type="button" className={`${a.btn} ${a.ghost}`} onClick={() => setPhotoKey("")}>
                <IconTrash size={18} aria-hidden="true" />
                Hapus foto
              </button>
            )}
          </div>
        </div>
        {photoErr && <p className={s.err} role="alert">{photoErr}</p>}
        {fe("photoKey")}
      </section>

      {fe("form")}
      <div className={s.actions}>
        <button type="submit" className={`${a.btn} ${a.pri}`} disabled={pending || uploading}>Simpan</button>
      </div>
    </form>
  );
}
