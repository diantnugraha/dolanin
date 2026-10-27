import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { CityTable } from "@/components/admin/CityTable";
import { SavedToast } from "@/components/admin/SavedToast";
import { listAdminCities } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import a from "@/components/admin/admin.module.css";

export default async function CitiesPage({ searchParams }: { searchParams: Promise<{ tersimpan?: string }> }) {
  await requireAdmin();
  const [rows, sp] = await Promise.all([listAdminCities(), searchParams]);
  return (
    <>
      <div className={a.top}>
        <div>
          <h1>Kota</h1>
          <p>{rows.length} kota</p>
        </div>
        <Link href="/admin/kota/baru" className={`${a.btn} ${a.go}`}>
          <IconPlus size={18} aria-hidden="true" />
          Tambah kota
        </Link>
      </div>
      <CityTable rows={rows} />
      <SavedToast show={sp.tersimpan === "1"} message="Kota tersimpan" />
    </>
  );
}
