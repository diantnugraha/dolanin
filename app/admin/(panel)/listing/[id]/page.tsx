import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingForm } from "@/components/admin/ListingForm";
import { getAdminListing, listCities } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import a from "@/components/admin/admin.module.css";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [listing, cities] = await Promise.all([getAdminListing(id), listCities()]);
  if (!listing) notFound();
  return (
    <>
      <div className={a.top}>
        <div>
          <p className={a.crumb}><Link href="/admin/listing">Listing</Link> / Ubah</p>
          <h1>Ubah listing</h1>
        </div>
      </div>
      <ListingForm cities={cities} initial={listing} />
    </>
  );
}
