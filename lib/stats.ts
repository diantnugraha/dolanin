import "server-only";
import { db } from "@/lib/db";
import { Prisma, type ListingType } from "../generated/prisma/client";
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

export const clickRatio = (pesan: number, wa: number, views: number): number | null =>
  views === 0 ? null : (pesan + wa) / views;

type Counts = { pesan: number; wa: number; views: number };
type Kpi = { value: number; delta: number | null };

// All windows are half-open [start, end). The current period ends at now + 1ms so an event at exactly `now` counts.
const endOf = (now: Date) => new Date(now.getTime() + 1);

const eventWhere = (f: StatsFilter, gte: Date, lt: Date): Prisma.EventWhereInput => ({
  createdAt: { gte, lt },
  ...(f.cityId ? { cityId: f.cityId } : {}),
  ...(f.type ? { type: f.type } : {}),
});

async function totals(f: StatsFilter, gte: Date, lt: Date): Promise<Counts> {
  const rows = await db.event.groupBy({ by: ["kind"], where: eventWhere(f, gte, lt), _count: { _all: true } });
  const c: Counts = { pesan: 0, wa: 0, views: 0 };
  for (const r of rows) {
    if (r.kind === "PESAN") c.pesan = r._count._all;
    else if (r.kind === "WA") c.wa = r._count._all;
    else c.views = r._count._all;
  }
  return c;
}

export async function getKpis(f: StatsFilter): Promise<{ pesan: Kpi; wa: Kpi; views: Kpi; ratio: number | null }> {
  const b = periodBounds(f.days, f.now ?? new Date());
  const [cur, prev] = await Promise.all([totals(f, b.from, endOf(b.to)), totals(f, b.prevFrom, b.prevTo)]);
  // prev window is [prevFrom, from) and cur is [from, now]: an event exactly at `from` counts in cur only.
  const k = (key: keyof Counts): Kpi => ({ value: cur[key], delta: pctChange(cur[key], prev[key]) });
  return { pesan: k("pesan"), wa: k("wa"), views: k("views"), ratio: clickRatio(cur.pesan, cur.wa, cur.views) };
}

export async function getDailySeries(f: StatsFilter): Promise<{ date: string; pesan: number; wa: number }[]> {
  const { from, to: now } = periodBounds(f.days, f.now ?? new Date());
  const end = endOf(now);
  const fromDay = new Date(from.getTime() + WIB).toISOString().slice(0, 10);
  // createdAt is `timestamp without time zone` holding UTC: tag it as UTC first, then convert to WIB.
  const filters = Prisma.sql`${f.cityId ? Prisma.sql`AND "cityId" = ${f.cityId}` : Prisma.empty}
    ${f.type ? Prisma.sql`AND "type" = ${f.type}::"ListingType"` : Prisma.empty}`;
  const rows = await db.$queryRaw<{ date: string; pesan: bigint; wa: bigint }[]>`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
           COALESCE(c.pesan, 0) AS pesan, COALESCE(c.wa, 0) AS wa
    FROM generate_series(${fromDay}::timestamp, ${fromDay}::timestamp + ${f.days - 1}::int * interval '1 day', interval '1 day') AS d(day)
    LEFT JOIN (
      SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date AS day,
             count(*) FILTER (WHERE "kind" = 'PESAN') AS pesan,
             count(*) FILTER (WHERE "kind" = 'WA') AS wa
      FROM "Event"
      WHERE "createdAt" >= ${from.toISOString()}::timestamp AND "createdAt" < ${end.toISOString()}::timestamp
      ${filters}
      GROUP BY 1
    ) c ON c.day = d.day::date
    ORDER BY d.day`;
  return rows.map((r) => ({ date: r.date, pesan: Number(r.pesan), wa: Number(r.wa) }));
}

export async function getPesanByCity(f: StatsFilter): Promise<{ name: string; count: number; other?: true }[]> {
  const { from, to: now } = periodBounds(f.days, f.now ?? new Date());
  const to = endOf(now);
  const groups = await db.event.groupBy({
    by: ["cityId"],
    where: { ...eventWhere(f, from, to), kind: "PESAN" },
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
  views: number; pesan: number; wa: number; ratio: number | null;
}[]> {
  const { from, to: now } = periodBounds(f.days, f.now ?? new Date());
  const to = endOf(now);
  const groups = await db.event.groupBy({
    by: ["listingId", "kind"],
    where: eventWhere(f, from, to),
    _count: { _all: true },
  });
  const agg = new Map<string, Counts>();
  for (const g of groups) {
    const c = agg.get(g.listingId) ?? { pesan: 0, wa: 0, views: 0 };
    if (g.kind === "PESAN") c.pesan = g._count._all;
    else if (g.kind === "WA") c.wa = g._count._all;
    else c.views = g._count._all;
    agg.set(g.listingId, c);
  }
  const ids = [...agg.entries()]
    .sort(([, a], [, b]) => b.pesan - a.pesan || b.wa - a.wa || b.views - a.views)
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
      views: c.views, pesan: c.pesan, wa: c.wa, ratio: clickRatio(c.pesan, c.wa, c.views),
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
      events: { none: { kind: { in: ["PESAN", "WA"] }, createdAt: { gte: from, lt: to } } },
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
