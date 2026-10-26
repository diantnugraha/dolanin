import "server-only";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/catalog";
import { listingWaText, waLink } from "@/lib/wa";
import type { EventKind } from "../generated/prisma/client";

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|slack|discord|headless/i;

export function isBot(ua: string | null): boolean {
  return !ua || BOT_RE.test(ua);
}

// Only published listings; copies cityId/type. No IP or personal data is stored.
export async function recordEvent(listingId: string, kind: EventKind): Promise<boolean> {
  const l = await db.listing.findFirst({
    where: { id: listingId, published: true },
    select: { cityId: true, type: true },
  });
  if (!l) return false;
  await db.event.create({ data: { listingId, kind, cityId: l.cityId, type: l.type } });
  return true;
}

type GoResult = { status: 302; location: string } | { status: 404 };

export async function resolveGo(id: string, kind: string, ua: string | null): Promise<GoResult> {
  if (kind !== "pesan" && kind !== "wa") return { status: 404 };
  const l = await db.listing.findFirst({
    where: { id, published: true },
    select: { name: true, slug: true, affiliateUrl: true, waNumber: true, city: { select: { slug: true } } },
  });
  if (!l) return { status: 404 };

  let location: string;
  if (kind === "pesan") {
    if (!/^https?:\/\//i.test(l.affiliateUrl)) return { status: 404 };
    location = l.affiliateUrl;
  } else {
    const number = l.waNumber ?? (await getSiteSettings()).waDefault;
    if (!number) return { status: 404 };
    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/${l.city.slug}/${l.slug}`;
    location = waLink(number, listingWaText(l.name, url));
  }

  if (!isBot(ua)) {
    try {
      await recordEvent(id, kind === "pesan" ? "PESAN" : "WA");
    } catch (e) {
      console.error("tracking: recordEvent failed", e);
    }
  }
  return { status: 302, location };
}
