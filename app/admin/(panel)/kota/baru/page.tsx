import Link from "next/link";
import { CityForm } from "@/components/admin/CityForm";
import { requireAdmin } from "@/lib/auth";
import a from "@/components/admin/admin.module.css";

export default async function NewCityPage() {
  await requireAdmin();
  return (
    <>
      <div className={a.top}>
        <div>
          <p className={a.crumb}><Link href="/admin/kota">Kota</Link> / Baru</p>
          <h1>Tambah kota</h1>
        </div>
      </div>
      <CityForm />
    </>
  );
}
