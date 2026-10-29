"use client";

import { useRef, useState, useActionState, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import { IconPlus, IconX } from "@tabler/icons-react";
import type { BookingChannel } from "../../generated/prisma/client";
import type { AdminListingDetail } from "@/lib/admin";
import type { Cover, ListingCardData } from "@/lib/catalog";
import { CHANNELS } from "@/lib/channels";
import { formatRupiah, parseRupiah } from "@/lib/format";
import { AMENITIES, BEDS, FACILITIES, TYPE_LABEL } from "@/lib/listing";
import { saveListingAction } from "./actions";
import { CardPreview } from "./CardPreview";
import { MediaManager, type MediaItem } from "./MediaManager";
import { useBlockFileDrop } from "./useBlockFileDrop";
import a from "./admin.module.css";
import s from "./form.module.css";

type ListingType = keyof typeof TYPE_LABEL;
type Errors = Record<string, string>;

const num = (n: number | null | undefined) => (n == null ? "" : formatRupiah(n).slice(2));
const reformat = (v: string) => {
  const n = parseRupiah(v);
  return n === null ? v : num(n);
};

function Field({ id, label, error, hint, children }: { id: string; label: ReactNode; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className={s.f}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small>{hint}</small>}
      {error && <p className={s.err} id={`${id}-err`} role="alert">{error}</p>}
    </div>
  );
}

export function ListingForm({ cities, initial }: { cities: { id: string; name: string }[]; initial?: AdminListingDetail }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [cityId, setCityId] = useState(initial?.cityId ?? "");
  const [type, setType] = useState<ListingType>(initial?.type ?? "HOTEL");
  const [area, setArea] = useState(initial?.area ?? "");
  const [mapsUrl, setMapsUrl] = useState(initial?.mapsUrl ?? "");
  const [price, setPrice] = useState(num(initial?.price));
  const [normalPrice, setNormalPrice] = useState(num(initial?.normalPrice));
  const [description, setDescription] = useState(initial?.description ?? "");
  // Keys dropped from FACILITIES have no chip to untick; keep them and the save fails with no way out.
  const [facilities, setFacilities] = useState<string[]>(
    (initial?.facilities ?? []).filter((k) => FACILITIES.some((f) => f.key === k)),
  );
  const chip = ({ key, label, Icon }: (typeof FACILITIES)[number]) => (
    <button key={key} type="button" aria-pressed={facilities.includes(key)}
      onClick={() => setFacilities((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))}>
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
  const [extras, setExtras] = useState<string[]>(initial?.extraFacilities ?? []);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraDraft, setExtraDraft] = useState("");
  const [links, setLinks] = useState<Partial<Record<BookingChannel, string>>>(initial?.links ?? {});
  const [published, setPublished] = useState(initial?.published ?? true);
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [items, setItems] = useState<MediaItem[]>(() =>
    (initial?.media ?? []).map((m, i) => ({ id: `db-${i}`, n: i + 1, kind: m.kind, key: m.key, status: m.status })),
  );
  const draft = useRef(false);
  useBlockFileDrop();

  const uploading = items.some((i) => i.uploading);

  const [errors, submit, pending] = useActionState<Errors, FormData>(async () => {
    try {
      const res = await saveListingAction(
      {
        name, cityId, type, area, mapsUrl, price, normalPrice, description,
        facilities, extraFacilities: extras, links,
        published: draft.current ? false : published,
        featured,
        media: items.filter((i) => i.key && !i.uploading).map((i, sortOrder) => ({ kind: i.kind, key: i.key, sortOrder })),
      },
      initial?.id,
    );
      return res.errors;
    } catch (e) {
      unstable_rethrow(e);
      return { form: "Gagal menyimpan. Periksa koneksi lalu coba lagi." };
    }
  }, {});

  function addExtra() {
    const v = extraDraft.trim();
    if (v) setExtras((cur) => [...cur, v]);
    setExtraDraft("");
  }

  const cover: Cover | null = (() => {
    const c = items.find((i) => i.key && (i.kind === "PHOTO" || i.status === "READY"));
    return !c ? null : c.kind === "PHOTO" ? { kind: "PHOTO", key: c.key } : { kind: "VIDEO", guid: c.key };
  })();
  const city = cities.find((c) => c.id === cityId);
  const priceN = parseRupiah(price);
  const normalN = parseRupiah(normalPrice);
  const preview: ListingCardData = {
    id: "preview", slug: "preview", citySlug: "preview", cityName: city?.name ?? "Kota",
    name: name || "Nama listing", type, area: area || "Area", price: priceN ?? 0, normalPrice: normalN, cover,
  };

  const err = (k: string) => errors[k];
  const bad = (k: string) => ({ "aria-invalid": err(k) ? true : undefined, "aria-describedby": err(k) ? `${k}-err` : undefined });
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form action={submit} noValidate className={s.form}>
      {/* Enter in a text field must run the normal "Simpan", not "Simpan draf". */}
      <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" disabled={pending || uploading}
        onClick={() => { draft.current = false; }} />
      <div>
        <section className={s.card}>
          <h2>Info dasar</h2>
          <p className={s.hint}>Yang tampil di kartu katalog.</p>
          <Field id="name" label="Nama" error={err("name")}>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} {...bad("name")} />
          </Field>
          <div className={s.row}>
            <Field id="cityId" label="Kota" error={err("cityId")}>
              <select id="cityId" value={cityId} onChange={(e) => setCityId(e.target.value)} {...bad("cityId")}>
                <option value="">Pilih kota</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <div className={s.f}>
              <fieldset className={s.seg}>
                <legend>Tipe</legend>
                <div className={s.segc}>
                  {(Object.keys(TYPE_LABEL) as ListingType[]).map((t) => (
                    <label key={t} className={type === t ? s.on : ""}>
                      <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} />
                      {TYPE_LABEL[t]}
                    </label>
                  ))}
                </div>
              </fieldset>
              {err("type") && <p className={s.err} role="alert">{err("type")}</p>}
            </div>
          </div>
          <div className={s.row}>
            <Field id="area" label="Area / alamat" error={err("area")}>
              <input id="area" value={area} onChange={(e) => setArea(e.target.value)} {...bad("area")} />
            </Field>
            <Field id="mapsUrl" label="Link Google Maps" error={err("mapsUrl")}>
              <input id="mapsUrl" inputMode="url" placeholder="https://maps.app.goo.gl/…" value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)} {...bad("mapsUrl")} />
            </Field>
          </div>
        </section>

        <section className={s.card}>
          <h2>Harga</h2>
          <p className={s.hint}>Per malam. Kalau harga normal diisi, listing otomatis diberi label Promo.</p>
          <div className={s.row}>
            <Field id="price" label="Harga per malam" error={err("price")}>
              <div className={s.money}>
                <span aria-hidden="true">Rp</span>
                <input id="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)}
                  onBlur={() => setPrice(reformat(price))} {...bad("price")} />
              </div>
            </Field>
            <Field id="normalPrice" label={<>Harga normal <em>(dicoret)</em></>} error={err("normalPrice")}>
              <div className={s.money}>
                <span aria-hidden="true">Rp</span>
                <input id="normalPrice" inputMode="numeric" value={normalPrice} onChange={(e) => setNormalPrice(e.target.value)}
                  onBlur={() => setNormalPrice(reformat(normalPrice))} {...bad("normalPrice")} />
              </div>
            </Field>
          </div>
        </section>

        <section className={s.card}>
          <h2>Foto &amp; video</h2>
          <p className={s.hint}>
            Seret untuk mengurutkan, atau pakai tombol geser. Media pertama jadi pembuka di halaman detail. Video vertikal 9:16, maksimal 4 menit.
          </p>
          <MediaManager items={items} setItems={setItems} error={err("media")} />
        </section>

        <section className={s.card}>
          <h2>Deskripsi</h2>
          <p className={s.hint}>Tampil sebagai &ldquo;Kenapa kami pilih ini&rdquo;. Tulis singkat, 2–3 kalimat.</p>
          <Field id="description" label="Deskripsi" error={err("description")}>
            <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} {...bad("description")} />
            <small className={s.count}>{description.length} / 300</small>
          </Field>
        </section>

        <section className={s.card}>
          <h2>Fasilitas</h2>
          <p className={s.hint}>Klik untuk memilih.</p>
          <div className={s.fac}>
            {AMENITIES.map(chip)}
            {extras.map((x, i) => (
              <button key={`${x}-${i}`} type="button" aria-pressed="true" aria-label={`Hapus ${x}`}
                onClick={() => setExtras((cur) => cur.filter((_, j) => j !== i))}>
                {x}
                <IconX size={14} aria-hidden="true" />
              </button>
            ))}
            <button type="button" className={s.addChip} aria-expanded={extraOpen} onClick={() => setExtraOpen((o) => !o)}>
              <IconPlus size={16} aria-hidden="true" />
              Lainnya
            </button>
          </div>
          {extraOpen && (
            <div className={s.extra}>
              <input aria-label="Fasilitas lainnya" value={extraDraft} maxLength={30} placeholder="Mis. Mushola"
                onChange={(e) => setExtraDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addExtra();
                  }
                }} />
              <button type="button" className={`${a.btn} ${a.ghost}`} onClick={addExtra}>Tambah</button>
            </div>
          )}
          <p className={s.sub} id="beds-label">Tipe kasur <small>Twin = 2 kasur single</small></p>
          <div className={s.fac} role="group" aria-labelledby="beds-label">
            {BEDS.map(chip)}
          </div>
          {(err("facilities") || err("extraFacilities")) && <p className={s.err} role="alert">{err("facilities") ?? err("extraFacilities")}</p>}
        </section>

        <section className={s.card}>
          <h2>Link pemesanan</h2>
          <p className={s.hint}>Isi minimal satu. Yang dikosongkan tidak tampil di halaman detail.</p>
          {initial?.legacyUrl && (
            <p className={s.legacy}>
              Link lama belum masuk channel mana pun: <span>{initial.legacyUrl}</span> Salin ke kolom yang sesuai, lalu simpan.
            </p>
          )}
          {CHANNELS.map((c) => {
            const id = `link-${c.slug}`;
            const e = err(`links.${c.id}`);
            const wa = c.id === "WHATSAPP";
            return (
              <Field key={c.id} id={id} error={e} hint={wa ? "Contoh: https://wa.me/6281234567890?text=Halo" : undefined}
                label={
                  <span className={s.lk}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 20px static icon */}
                    <img src={`/channels/icon-${c.slug}.png`} alt="" width={20} height={20} />
                    {c.label}
                  </span>
                }>
                <input id={id} inputMode="url" placeholder={wa ? "https://wa.me/628…" : "https://"} value={links[c.id] ?? ""}
                  onChange={(ev) => setLinks((l) => ({ ...l, [c.id]: ev.target.value }))}
                  aria-invalid={e ? true : undefined} aria-describedby={e ? `${id}-err` : undefined} />
              </Field>
            );
          })}
          {err("links") && <p className={s.err} role="alert">{err("links")}</p>}
        </section>
      </div>

      <div className={s.side}>
        <section className={s.card} aria-label="Penayangan">
          <div className={s.sw}>
            <div><b id="sw-pub">Tayangkan</b><small>Mati = disimpan sebagai draf</small></div>
            <button type="button" role="switch" aria-checked={published} aria-labelledby="sw-pub" className={s.tog}
              onClick={() => setPublished((v) => !v)} />
          </div>
          <div className={s.sw}>
            <div><b id="sw-feat">Promo minggu ini</b><small>Tampil di landing</small></div>
            <button type="button" role="switch" aria-checked={featured} aria-labelledby="sw-feat" className={s.tog}
              onClick={() => setFeatured((v) => !v)} />
          </div>
          {err("form") && <p className={s.err} role="alert">{err("form")}</p>}
          {hasErrors && <p className={s.err} role="alert">Periksa lagi isian yang ditandai.</p>}
          {uploading && <p className={s.hint}>Tunggu unggahan selesai dulu.</p>}
          <div className={s.save}>
            <button type="submit" className={`${a.btn} ${a.ghost}`} disabled={pending || uploading}
              onClick={() => { draft.current = true; }}>
              Simpan draf
            </button>
            <button type="submit" className={`${a.btn} ${a.pri}`} disabled={pending || uploading}
              onClick={() => { draft.current = false; }}>
              Simpan
            </button>
          </div>
        </section>
        <CardPreview data={preview} />
      </div>
    </form>
  );
}
