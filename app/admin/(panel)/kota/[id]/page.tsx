import Link from "next/link";
import { notFound } from "next/navigation";
import { CityForm } from "@/components/admin/CityForm";
import { getAdminCity } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import a from "@/components/admin/admin.module.css";

export default async function EditCityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const city = await getAdminCity(id);
  if (!city) notFound();
  return (
    <>
      <div className={a.top}>
        <div>
          <p className={a.crumb}><Link href="/admin/kota">Kota</Link> / Ubah</p>
          <h1>Ubah kota</h1>
        </div>
      </div>
      <CityForm initial={city} />
    </>
  );
}
