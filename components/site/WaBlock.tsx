import { IconBrandWhatsapp } from "@tabler/icons-react";
import { GENERAL_WA_TEXT, waLink } from "@/lib/wa";
import s from "./WaBlock.module.css";

export function WaBlock({ waDefault }: { waDefault: string | null }) {
  if (!waDefault) return null;
  return (
    <section className={s.help}>
      <div>
        <b>Bingung pilih yang mana?</b>
        <p>Ceritakan tujuan dan budget-mu, nanti kami bantu carikan.</p>
      </div>
      <a className={s.btn} href={waLink(waDefault, GENERAL_WA_TEXT)} target="_blank" rel="noopener noreferrer">
        <IconBrandWhatsapp size={20} stroke={1.75} aria-hidden="true" />
        Chat WhatsApp
      </a>
    </section>
  );
}
