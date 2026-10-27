import Link from "next/link";
import { IconExternalLink, IconPencil, IconPlayerPlayFilled } from "@tabler/icons-react";
import type { AdminListingRow } from "@/lib/admin";
import { formatRupiah, relativeTimeId } from "@/lib/format";
import { isPromo, TYPE_LABEL } from "@/lib/listing";
import { CoverImage } from "@/components/site/Media";
import { DeleteMenu } from "./DeleteMenu";
import s from "./listing.module.css";

export function ListingTable({ rows }: { rows: AdminListingRow[] }) {
  if (rows.length === 0) return <p className={s.empty}>Belum ada listing yang cocok.</p>;
  const now = new Date();
  return (
    <div className={s.tbl}>
      <table>
        <thead>
          <tr>
            <th>Listing</th>
            <th>Kota</th>
            <th>Tipe</th>
            <th>Harga / malam</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <div className={s.it}>
                  <span className={s.thumb}>
                    <CoverImage cover={r.cover} sizes="56px" />
                    {r.hasVideo && (
                      <span className={s.vd} title="Punya video">
                        <IconPlayerPlayFilled size={12} aria-hidden="true" />
                        <span className="sr-only">Punya video</span>
                      </span>
                    )}
                  </span>
                  <div>
                    <b>{r.name}</b>
                    <small>
                      {r.area} · diubah {relativeTimeId(r.updatedAt, now)}
                    </small>
                  </div>
                </div>
              </td>
              <td>{r.cityName}</td>
              <td>
                <span className={s.type}>{TYPE_LABEL[r.type]}</span>
              </td>
              <td className={s.pr}>
                {isPromo(r) && <s>{formatRupiah(r.normalPrice!)}</s>}
                <b>{formatRupiah(r.price)}</b>
                {isPromo(r) && <span className={s.promo}>Promo</span>}
              </td>
              <td>
                <span className={`${s.st} ${r.published ? "" : s.draft}`}>
                  <i className={s.dot} aria-hidden="true" />
                  {r.published ? "Tayang" : "Draf"}
                </span>
              </td>
              <td>
                <div className={s.act}>
                  <Link href={`/admin/listing/${r.id}`} className={s.ib} aria-label={`Ubah ${r.name}`}>
                    <IconPencil size={17} aria-hidden="true" />
                  </Link>
                  {r.published && (
                    <a href={`/${r.citySlug}/${r.slug}`} target="_blank" rel="noopener" className={s.ib}
                      aria-label={`Buka ${r.name} di web`}>
                      <IconExternalLink size={17} aria-hidden="true" />
                    </a>
                  )}
                  <DeleteMenu id={r.id} name={r.name} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
