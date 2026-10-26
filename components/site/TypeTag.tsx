import type { ListingType } from "../../generated/prisma/client";
import { TYPE_LABEL } from "@/lib/listing";
import s from "./TypeTag.module.css";

export function TypeTag({ type }: { type: ListingType }) {
  return <span className={s.tag}>{TYPE_LABEL[type]}</span>;
}
