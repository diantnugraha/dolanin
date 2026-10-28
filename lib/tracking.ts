import "server-only";
import { db } from "@/lib/db";
import { channelBySlug } from "@/lib/channels";
import type { BookingChannel, EventKind } from "../generated/prisma/client";

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|slack|discord|headless/i;

export function isBot(ua: string | null): boolean {
  return !ua || BOT_RE.test(ua);
}

// Only published listings; copies cityId/type. No IP or personal data is stored.
export async function recordEvent(listingId: string, kind: EventKind, channel?: BookingChannel): Promise<boolean> {
  const l = await db.listing.findFirst({
    where: { id: listingId, published: true },
    select: { cityId: true, type: true },
  });
  if (!l) return false;
  await db.event.create({ data: { listingId, kind, channel, cityId: l.cityId, type: l.type } });
  return true;
}

type GoResult = { status: 302; location: string } | { status: 404 };

/**
 * `kind` is a channel slug (`agoda`, …, `whatsapp`). The pre-channel slugs still work for cached pages:
 * `pesan` = first non-WhatsApp link (else WhatsApp), `wa` = WhatsApp.
 * `record: false` (HEAD requests) resolves the same redirect without counting a click.
 */
export async function resolveGo(
  id: string,
  kind: string,
  ua: string | null,
  { record = true }: { record?: boolean } = {},
): Promise<GoResult> {
  const wanted = kind === "pesan" || kind === "wa" ? kind : channelBySlug(kind)?.id;
  if (!wanted) return { status: 404 };
  const l = await db.listing.findFirst({
    where: { id, published: true },
    select: { links: { select: { channel: true, url: true }, orderBy: { channel: "asc" } } },
  });
  if (!l) return { status: 404 };

  const link =
    wanted === "pesan"
      ? (l.links.find((k) => k.channel !== "WHATSAPP") ?? l.links.find((k) => k.channel === "WHATSAPP"))
      : l.links.find((k) => k.channel === (wanted === "wa" ? "WHATSAPP" : wanted));
  if (!link || !/^https?:\/\//i.test(link.url)) return { status: 404 };

  if (record && !isBot(ua)) {
    try {
      await recordEvent(id, "CLICK", link.channel);
    } catch (e) {
      console.error("tracking: recordEvent failed", e);
    }
  }
  return { status: 302, location: link.url };
}
