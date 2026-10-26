import Link from "next/link";
import { ListingForm } from "@/components/admin/ListingForm";
import { listCities } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import a from "@/components/admin/admin.module.css";

export default async function NewListingPage() {
  await requireAdmin();
  const cities = await listCities();
  return (
    <>
      <div className={a.top}>
        <div>
          <p className={a.crumb}><Link href="/admin/listing">Listing</Link> / Baru</p>
          <h1>Tambah listing</h1>
        </div>
      </div>
      <ListingForm cities={cities} />
    </>
  );
}
