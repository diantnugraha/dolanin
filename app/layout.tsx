import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100"),
  title: "Dolanin",
  description:
    "Bandingkan hotel, penginapan, dan villa murah per kota, lalu pesan lewat link resmi atau tanya via WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
