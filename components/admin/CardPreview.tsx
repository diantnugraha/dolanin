"use client";

import { IconEye } from "@tabler/icons-react";
import type { ListingCardData } from "@/lib/catalog";
import { ListingCard } from "@/components/site/ListingCard";
import s from "./form.module.css";

export function CardPreview({ data }: { data: ListingCardData }) {
  return (
    <section className={s.prev} aria-labelledby="prev-h">
      <h3 id="prev-h">
        <IconEye size={16} aria-hidden="true" />
        Pratinjau kartu
      </h3>
      <ListingCard data={data} variant="card" linkless />
    </section>
  );
}
