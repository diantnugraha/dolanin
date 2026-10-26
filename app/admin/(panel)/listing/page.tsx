import Link from "next/link";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { ListingTable } from "@/components/admin/ListingTable";
import { SavedToast } from "@/components/admin/SavedToast";
import { listAdminListings, listCities } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { TYPE_LABEL } from "@/lib/listing";
import a from "@/components/admin/admin.module.css";
import s from "@/components/admin/listing.module.css";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ListingPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q);
  const kota = one(sp.kota);
  const tipe = one(sp.tipe);
  const status = one(sp.status);
  const [rows, cities] = await Promise.all([
    listAdminListings({
      q,
      cityId: kota || undefined,
      type: tipe in TYPE_LABEL ? (tipe as keyof typeof TYPE_LABEL) : undefined,
      status: status === "tayang" || status === "draf" ? status : undefined,
    }),
    listCities(),
  ]);
  return (
    <>
      <div className={a.top}>
        <div>
          <h1>Listing</h1>
          <p>{rows.length} listing</p>
        </div>
        <Link href="/admin/listing/baru" className={`${a.btn} ${a.go}`}>
          <IconPlus size={18} aria-hidden="true" />
          Tambah listing
        </Link>
      </div>
      <form method="get" className={s.bar} role="search">
        <div className={s.search}>
          <IconSearch size={18} aria-hidden="true" />
          <input type="search" name="q" defaultValue={q} placeholder="Cari nama listing" aria-label="Cari nama listing" />
        </div>
        <select name="kota" defaultValue={kota} aria-label="Kota">
          <option value="">Semua kota</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="tipe" defaultValue={tipe} aria-label="Tipe">
          <option value="">Semua tipe</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="status" defaultValue={status} aria-label="Status">
          <option value="">Semua status</option>
          <option value="tayang">Tayang</option>
          <option value="draf">Draf</option>
        </select>
        <button type="submit" className={`${a.btn} ${a.ghost}`}>Cari</button>
      </form>
      <ListingTable rows={rows} />
      <SavedToast show={one(sp.tersimpan) === "1"} />
    </>
  );
}
