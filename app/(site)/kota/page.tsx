import type { Metadata } from "next";
import { CityTile } from "@/components/site/CityTile";
import { getCityBoard } from "@/lib/catalog";
import s from "./page.module.css";

export const metadata: Metadata = { title: "Semua kota | Dolanin" };

export default async function KotaPage() {
  const cities = await getCityBoard();
  return (
    <div className="wrap">
      <h1 className={s.h1}>Semua kota</h1>
      <div className={s.grid}>
        {cities.map((c) => (
          <CityTile key={c.id} city={c} />
        ))}
      </div>
    </div>
  );
}
