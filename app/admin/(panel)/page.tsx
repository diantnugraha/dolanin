import { IconInfoCircle } from "@tabler/icons-react";
import { BarList } from "@/components/admin/BarList";
import { KpiTile } from "@/components/admin/KpiTile";
import { LineChart } from "@/components/admin/LineChart";
import { StatsFilters } from "@/components/admin/StatsFilters";
import { TopListings } from "@/components/admin/TopListings";
import { ZeroClicks } from "@/components/admin/ZeroClicks";
import a from "@/components/admin/admin.module.css";
import d from "@/components/admin/dashboard.module.css";
import { listCities } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { channelById } from "@/lib/channels";
import { formatCount, formatDateRange, formatDay, formatPercent } from "@/lib/format";
import { TYPE_LABEL } from "@/lib/listing";
import {
  getClicksByChannel, getClicksByCity, getDailySeries, getKpis, getTopListings, getZeroClickListings, periodBounds,
  type StatsFilter,
} from "@/lib/stats";

type SP = { rentang?: string; kota?: string; tipe?: string };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const [sp, cities] = await Promise.all([searchParams, listCities()]);
  const days = ([7, 30, 90] as const).find((n) => String(n) === sp.rentang) ?? 30;
  const cityId = cities.find((c) => c.id === sp.kota)?.id;
  const type = (Object.keys(TYPE_LABEL) as (keyof typeof TYPE_LABEL)[]).find((t) => t.toLowerCase() === sp.tipe);
  const now = new Date();
  const filter: StatsFilter = { days, cityId, type, now };

  const [kpis, series, byChannel, byCity, top, zero] = await Promise.all([
    getKpis(filter), getDailySeries(filter), getClicksByChannel(filter), getClicksByCity(filter),
    getTopListings(filter), getZeroClickListings(filter),
  ]);
  const rangeLabel = formatDateRange(periodBounds(days, now).from, now);
  const chartLabel = `Grafik garis jumlah klik per hari, ${formatDay(series[0].date)} sampai ${formatDay(series[series.length - 1].date)}`;
  const prev = `dari ${days} hari sebelumnya`;
  const channelRows = byChannel.map((r) => {
    if (r.channel === null) return { key: "lainnya", name: "Lainnya", count: r.count, share: r.share, other: true as const };
    const c = channelById(r.channel);
    return { key: c.slug, name: c.label, count: r.count, share: r.share, icon: `/channels/icon-${c.slug}.png` };
  });
  const topChannel = kpis.top && channelById(kpis.top.channel);

  return (
    <div className={d.db}>
      <div className={a.top}>
        <div>
          <h1>Dashboard</h1>
          <p>Seberapa sering pengunjung menekan tombol pemesanan, per channel.</p>
        </div>
      </div>
      <StatsFilters filter={filter} cities={cities} rangeLabel={rangeLabel} />

      <div className={d.kpi}>
        <KpiTile hero id="clicks" label="Total klik" keyColor="#F26B3A" value={formatCount(kpis.clicks.value)} delta={kpis.clicks.delta} deltaSuffix={prev} />
        <KpiTile id="views" label="Kunjungan halaman detail" value={formatCount(kpis.views.value)} delta={kpis.views.delta} />
        <KpiTile id="ratio" label="Rasio klik" value={formatPercent(kpis.ratio)} note="klik ÷ kunjungan detail" />
        <KpiTile id="top" label="Channel teratas" value={topChannel ? topChannel.label : "–"}
          note={kpis.top ? `${formatPercent(kpis.top.share)} dari semua klik` : undefined} />
      </div>

      <div className={d.row}>
        <div className={d.card}>
          <div className={d.hd}>
            <div>
              <h2>Klik per hari</h2>
              <p className={d.sub}>Arahkan kursor ke grafik untuk melihat angka per tanggal</p>
            </div>
          </div>
          <LineChart series={series} label={chartLabel} />
        </div>
        <div className={d.card}>
          <div className={d.hd}>
            <div>
              <h2>Klik per channel</h2>
              <p className={d.sub}>{days} hari terakhir</p>
            </div>
          </div>
          <BarList rows={channelRows} total={kpis.clicks.value} unit="klik" />
        </div>
      </div>

      <div className={d.row}>
        <div className={d.card}>
          <div className={d.hd}>
            <div>
              <h2>Listing paling banyak diklik</h2>
              <p className={d.sub}>Urut dari klik terbanyak</p>
            </div>
          </div>
          <TopListings rows={top} />
        </div>
        <div className={d.card}>
          <div className={d.hd}>
            <div>
              <h2>Klik per kota</h2>
              <p className={d.sub}>{days} hari terakhir</p>
            </div>
          </div>
          <BarList rows={byCity.map((r) => ({ ...r, key: r.name }))} total={kpis.clicks.value} unit="klik" />
        </div>
      </div>

      <div className={`${d.card} ${d.full}`}>
        <div className={d.hd}>
          <div>
            <h2>Belum ada klik</h2>
            <p className={d.sub}>Tayang, tapi 0 klik dalam {days} hari</p>
          </div>
        </div>
        <ZeroClicks rows={zero} />
      </div>

      <p className={d.note}>
        <IconInfoCircle size={16} aria-hidden="true" />
        Klik bukan pemesanan. Booking dan komisi dilihat di dashboard affiliate masing-masing.
      </p>
    </div>
  );
}
