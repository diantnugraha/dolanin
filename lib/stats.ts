import "server-only";
import { db } from "@/lib/db";
import { Prisma, type BookingChannel, type ListingType } from "../generated/prisma/client";
import { CHANNELS } from "./channels";
import { coverMediaSelect, toCover, type Cover } from "./catalog";

export type StatsFilter = { days: 7 | 30 | 90; cityId?: string; type?: ListingType; now?: Date };

const DAY = 86_400_000;
const WIB = 7 * 3_600_000; // Asia/Jakarta is UTC+7, no DST

/** `from` = 00:00 WIB of day (today - (days-1)); previous period is the same length right before it. */
export function periodBounds(days: number, now: Date) {
  const wibMidnight = Math.floor((now.getTime() + WIB) / DAY) * DAY - WIB;
  const from = new Date(wibMidnight - (days - 1) * DAY);
  return { from, to: now, prevFrom: new Date(from.getTime() - days * DAY), prevTo: from };
}

export const pctChange = (curr: number, prev: number): number | null =>
  prev === 0 ? null : (curr - prev) / prev;

export const clickRatio = (clicks: number, views: number): number | null => (views === 0 ? null : clicks / views);

type Kpi = { value: number; delta: number | null };
type ChannelCount = { channel: BookingChannel | null; count: number };

// All windows are half-open [start, end). The current period ends at now + 1ms so an event at exactly `now` counts.
const endOf = (now: Date) => new Date(now.getTime() + 1);

const eventWhere = (f: StatsFilter, gte: Date, lt: Date): Prisma.EventWhereInput => ({
  createdAt: { gte, lt },
  ...(f.cityId ? { cityId: f.cityId } : {}),
  ...(f.type ? { type: f.type } : {}),
});

async function totals(f: StatsFilter, gte: Date, lt: Date): Promise<{ clicks: number; views: number }> {
  const rows = await db.event.groupBy({ by: ["kind"], where: eventWhere(f, gte, lt), _count: { _all: true } });
  const n = (k: "CLICK" | "VIEW") => rows.find((r) => r.kind === k)?._count._all ?? 0;
  return { clicks: n("CLICK"), views: n("VIEW") };
}

async function channelCounts(f: StatsFilter, gte: Date, lt: Date): Promise<ChannelCount[]> {
  const rows = await db.event.groupBy({
    by: ["channel"],
    where: { ...eventWhere(f, gte, lt), kind: "CLICK" },
    _count: { _all: true },
  });
  return rows.map((r) => ({ channel: r.channel, count: r._count._all }));
}

/** The channel with the most clicks; legacy clicks without a channel ("Lainnya") never win. Ties: channel order. */
function topOf(counts: ChannelCount[]): ChannelCount | null {
  const order = CHANNELS.map((c) => c.id as BookingChannel);
  const real = counts.filter((c): c is ChannelCount & { channel: BookingChannel } => c.channel !== null && c.count > 0);
  real.sort((a, b) => b.count - a.count || order.indexOf(a.channel) - order.indexOf(b.channel));
  return real[0] ?? null;
}

export async function getKpis(f: StatsFilter): Promise<{
  clicks: Kpi; views: Kpi; ratio: number | null; top: { channel: BookingChannel; share: number } | null;
}> {
  const b = periodBounds(f.days, f.now ?? new Date());
  const [cur, prev, byChannel] = await Promise.all([
    totals(f, b.from, endOf(b.to)), totals(f, b.prevFrom, b.prevTo), channelCounts(f, b.from, endOf(b.to)),
  ]);
  // prev window is [prevFrom, from) and cur is [from, now]: an event exactly at `from` counts in cur only.
  const k = (key: "clicks" | "views"): Kpi => ({ value: cur[key], delta: pctChange(cur[key], prev[key]) });
  const top = topOf(byChannel);
  return {
    clicks: k("clicks"), views: k("views"), ratio: clickRatio(cur.clicks, cur.views),
    top: top && { channel: top.channel!, share: top.count / cur.clicks },
  };
}

/** Clicks per channel, most first, "Lainnya" (null) always last; shares are of all clicks so the bars sum to 100%. */
export async function getClicksByChannel(f: StatsFilter): Promise<(ChannelCount & { share: number })[]> {
  const { from, to: now } = periodBounds(f.days, f.now ?? new Date());
  const counts = (await channelCounts(f, from, endOf(now))).filter((c) => c.count > 0);
  const total = counts.reduce((s, c) => s + c.count, 0);
  const order = CHANNELS.map((c) => c.id as BookingChannel);
  const rank = (c: ChannelCount) => (c.channel === null ? Infinity : order.indexOf(c.channel));
  return counts
    .sort((a, b) => (a.channel === null ? 1 : 0) - (b.channel === null ? 1 : 0) || b.count - a.count || rank(a) - rank(b))
    .map((c) => ({ ...c, share: c.count / total }));
}

export async function getDailySeries(f: StatsFilter): Promise<{ date: string; clicks: number }[]> {
  const { from, to: now } = periodBounds(f.days, f.now ?? new Date());
  const end = endOf(now);
  const fromDay = new Date(from.getTime() + WIB).toISOString().slice(0, 10);
  // createdAt is `timestamp without time zone` holding UTC: tag it as UTC first, then convert to WIB.
  const filters = Prisma.sql`${f.cityId ? Prisma.sql`AND "cityId" = ${f.cityId}` : Prisma.empty}
    ${f.type ? Prisma.sql`AND "type" = ${f.type}::"ListingType"` : Prisma.empty}`;
  const rows = await db.$queryRaw<{ date: string; clicks: bigint }[]>`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS date, COALESCE(c.clicks, 0) AS clicks
    FROM generate_series(${fromDay}::timestamp, ${fromDay}::timestamp + ${f.days - 1}::int * interval '1 day', interval '1 day') AS d(day)
    LEFT JOIN (
      SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date AS day, count(*) AS clicks
      FROM "Event"
      WHERE "kind" = 'CLICK' AND "createdAt" >= ${from.toISOString()}::timestamp AND "createdAt" < ${end.toISOString()}::timestamp
      ${filters}
      GROUP BY 1
    ) c ON c.day = d.day::date
    ORDER BY d.day`;
  return rows.map((r) => ({ date: r.date, clicks: Number(r.clicks) }));
}

export async function getClicksByCity(f: StatsFilter): Promise<{ name: string; count: number; other?: true }[]> {
  const { from, to: now } = periodBounds(f.days, f.now ?? new Date());
  const to = endOf(now);
  const groups = await db.event.groupBy({
    by: ["cityId"],
    where: { ...eventWhere(f, from, to), kind: "CLICK" },
    _count: { _all: true },
  });
  const cities = await db.city.findMany({ where: { id: { in: groups.map((g) => g.cityId) } }, select: { id: true, name: true } });
  const names = new Map(cities.map((c) => [c.id, c.name]));
  const rows = groups
    .map((g) => ({ name: names.get(g.cityId) ?? "?", count: g._count._all }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const top = rows.slice(0, 5);
  const rest = rows.slice(5).reduce((s, r) => s + r.count, 0);
  return rest > 0 ? [...top, { name: "Kota lainnya", count: rest, other: true }] : top;
}

const listingSelect = {
  id: true, name: true, city: { select: { name: true } }, media: coverMediaSelect,
} satisfies Prisma.ListingSelect;

export async function getTopListings(f: StatsFilter, limit = 5): Promise<{
  id: string; name: string; cityName: string; cover: Cover | null;
  views: number; clicks: number; topChannel: BookingChannel | null; ratio: number | null;
}[]> {
  const { from, to: now } = periodBounds(f.days, f.now ?? new Date());
  const to = endOf(now);
  const groups = await db.event.groupBy({
    by: ["listingId", "kind", "channel"],
    where: eventWhere(f, from, to),
    _count: { _all: true },
  });
  const agg = new Map<string, { clicks: number; views: number; channels: ChannelCount[] }>();
  for (const g of groups) {
    const c = agg.get(g.listingId) ?? { clicks: 0, views: 0, channels: [] };
    if (g.kind === "CLICK") {
      c.clicks += g._count._all;
      c.channels.push({ channel: g.channel, count: g._count._all });
    } else c.views += g._count._all;
    agg.set(g.listingId, c);
  }
  const ids = [...agg.entries()]
    .sort(([, a], [, b]) => b.clicks - a.clicks || b.views - a.views)
    .slice(0, limit)
    .map(([id]) => id);
  if (!ids.length) return [];
  const listings = await db.listing.findMany({ where: { id: { in: ids } }, select: listingSelect });
  const byId = new Map(listings.map((l) => [l.id, l]));
  return ids.flatMap((id) => {
    const l = byId.get(id);
    if (!l) return [];
    const c = agg.get(id)!;
    return [{
      id, name: l.name, cityName: l.city.name, cover: toCover(l.media[0]),
      views: c.views, clicks: c.clicks, topChannel: topOf(c.channels)?.channel ?? null, ratio: clickRatio(c.clicks, c.views),
    }];
  });
}

export async function getZeroClickListings(f: StatsFilter, limit = 5): Promise<{
  id: string; name: string; cityName: string; cover: Cover | null; views: number;
}[]> {
  const { from, to: now } = periodBounds(f.days, f.now ?? new Date());
  const to = endOf(now);
  const listings = await db.listing.findMany({
    where: {
      published: true,
      ...(f.cityId ? { cityId: f.cityId } : {}),
      ...(f.type ? { type: f.type } : {}),
      events: { none: { kind: "CLICK", createdAt: { gte: from, lt: to } } },
    },
    select: listingSelect,
  });
  if (!listings.length) return [];
  const views = await db.event.groupBy({
    by: ["listingId"],
    where: { kind: "VIEW", createdAt: { gte: from, lt: to }, listingId: { in: listings.map((l) => l.id) } },
    _count: { _all: true },
  });
  const v = new Map(views.map((g) => [g.listingId, g._count._all]));
  return listings
    .map((l) => ({
      id: l.id, name: l.name, cityName: l.city.name, cover: toCover(l.media[0]), views: v.get(l.id) ?? 0,
    }))
    .sort((a, b) => b.views - a.views || a.name.localeCompare(b.name))
    .slice(0, limit);
}
