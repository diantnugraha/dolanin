import type { Metadata } from "next";
import { connection } from "next/server";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { NotFoundBody } from "@/components/site/StatusPage";
import { getSiteSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Halaman tidak ditemukan | Dolanin" };

// URLs no route matches (and notFound() outside the site group): same shell as the site.
export default async function NotFound() {
  await connection(); // the header's WA number is live data, not a build-time snapshot
  const waDefault = await getSiteSettings().then((x) => x.waDefault, () => null);
  return (
    <>
      <Header waDefault={waDefault} />
      <main>
        <NotFoundBody />
      </main>
      <Footer />
    </>
  );
}
