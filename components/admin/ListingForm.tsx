"use client";

import { useRef, useState, useActionState, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import { IconPlus, IconX } from "@tabler/icons-react";
import type { AdminListingDetail } from "@/lib/admin";
import type { Cover, ListingCardData } from "@/lib/catalog";
import { formatRupiah, parseRupiah } from "@/lib/format";
import { FACILITIES, TYPE_LABEL } from "@/lib/listing";
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
  const [extras, setExtras] = useState<string[]>(initial?.extraFacilities ?? []);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraDraft, setExtraDraft] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState(initial?.affiliateUrl ?? "");
  const [waNumber, setWaNumber] = useState(initial?.waNumber ?? "");
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
        facilities, extraFacilities: extras, affiliateUrl, waNumber,
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
            {FACILITIES.map(({ key, label, Icon }) => (
              <button key={key} type="button" aria-pressed={facilities.includes(key)}
                onClick={() => setFacilities((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))}>
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
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
          {(err("facilities") || err("extraFacilities")) && <p className={s.err} role="alert">{err("facilities") ?? err("extraFacilities")}</p>}
        </section>

        <section className={s.card}>
          <h2>Tombol Pesan &amp; WhatsApp</h2>
          <p className={s.hint}>Ke mana pengunjung diarahkan dari halaman detail.</p>
          <Field id="affiliateUrl" label="Link affiliate (tombol Pesan)" hint="Link dibuka di tab baru." error={err("affiliateUrl")}>
            <input id="affiliateUrl" inputMode="url" placeholder="https://" value={affiliateUrl}
              onChange={(e) => setAffiliateUrl(e.target.value)} {...bad("affiliateUrl")} />
          </Field>
          <Field id="waNumber" label="Nomor WhatsApp" hint="Kosongkan untuk memakai nomor default dari Pengaturan." error={err("waNumber")}>
            <input id="waNumber" inputMode="tel" placeholder="0812-0000-0000" value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)} {...bad("waNumber")} />
          </Field>
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
