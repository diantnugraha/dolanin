import { IconInfoCircle } from "@tabler/icons-react";
import { CityBars } from "@/components/admin/CityBars";
import { KpiTile } from "@/components/admin/KpiTile";
import { LineChart } from "@/components/admin/LineChart";
import { StatsFilters } from "@/components/admin/StatsFilters";
import { TopListings } from "@/components/admin/TopListings";
import { ZeroClicks } from "@/components/admin/ZeroClicks";
import a from "@/components/admin/admin.module.css";
import d from "@/components/admin/dashboard.module.css";
import { listCities } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatCount, formatDateRange, formatDay, formatPercent } from "@/lib/format";
import { TYPE_LABEL } from "@/lib/listing";
import {
  getDailySeries, getKpis, getPesanByCity, getTopListings, getZeroClickListings, periodBounds,
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

  const [kpis, series, byCity, top, zero] = await Promise.all([
    getKpis(filter), getDailySeries(filter), getPesanByCity(filter), getTopListings(filter), getZeroClickListings(filter),
  ]);
  const rangeLabel = formatDateRange(periodBounds(days, now).from, now);
  const chartLabel = `Grafik garis klik Pesan dan Chat WA per hari, ${formatDay(series[0].date)} sampai ${formatDay(series[series.length - 1].date)}`;
  const prev = `dari ${days} hari sebelumnya`;

  return (
    <div className={d.db}>
      <div className={a.top}>
        <div>
          <h1>Dashboard</h1>
          <p>Seberapa sering pengunjung menekan tombol Pesan dan WhatsApp.</p>
        </div>
      </div>
      <StatsFilters filter={filter} cities={cities} rangeLabel={rangeLabel} />

      <div className={d.kpi}>
        <KpiTile hero id="pesan" label="Klik tombol Pesan" keyColor="#F26B3A" value={formatCount(kpis.pesan.value)} delta={kpis.pesan.delta} deltaSuffix={prev} />
        <KpiTile id="wa" label="Chat WhatsApp" keyColor="#00918F" value={formatCount(kpis.wa.value)} delta={kpis.wa.delta} />
        <KpiTile id="views" label="Kunjungan halaman detail" value={formatCount(kpis.views.value)} delta={kpis.views.delta} />
        <KpiTile id="ratio" label="Rasio klik" value={formatPercent(kpis.ratio)} note="(Pesan + WA) ÷ kunjungan detail" />
      </div>

      <div className={d.row}>
        <div className={d.card}>
          <div className={d.hd}>
            <div>
              <h2>Klik per hari</h2>
              <p className={d.sub}>Arahkan kursor ke grafik untuk melihat angka per tanggal</p>
            </div>
            <div className={d.legend}>
              <span><i style={{ background: "#F26B3A" }} />Pesan</span>
              <span><i style={{ background: "#00918F" }} />Chat WA</span>
            </div>
          </div>
          <LineChart series={series} label={chartLabel} />
        </div>
        <div className={d.card}>
          <div className={d.hd}>
            <div>
              <h2>Klik Pesan per kota</h2>
              <p className={d.sub}>{days} hari terakhir</p>
            </div>
          </div>
          <CityBars rows={byCity} total={kpis.pesan.value} />
        </div>
      </div>

      <div className={d.row}>
        <div className={d.card}>
          <div className={d.hd}>
            <div>
              <h2>Listing paling banyak diklik</h2>
              <p className={d.sub}>Urut dari klik Pesan terbanyak</p>
            </div>
          </div>
          <TopListings rows={top} />
        </div>
        <div className={d.card}>
          <div className={d.hd}>
            <div>
              <h2>Belum ada klik</h2>
              <p className={d.sub}>Tayang, tapi 0 klik dalam {days} hari</p>
            </div>
          </div>
          <ZeroClicks rows={zero} />
        </div>
      </div>

      <p className={d.note}>
        <IconInfoCircle size={16} aria-hidden="true" />
        Klik bukan pemesanan. Booking dan komisi dilihat di dashboard affiliate masing-masing.
      </p>
    </div>
  );
}
