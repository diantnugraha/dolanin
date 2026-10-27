import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { getSiteSettings } from "@/lib/catalog";

// ponytail: tanpa cache; tambahkan ISR + revalidatePath kalau beban DB terasa
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { waDefault } = await getSiteSettings();
  return (
    <>
      <Header waDefault={waDefault} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
