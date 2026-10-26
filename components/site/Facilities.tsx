import { IconCheck } from "@tabler/icons-react";
import { FACILITIES } from "@/lib/listing";
import s from "./Facilities.module.css";

export function Facilities({ keys, extra }: { keys: string[]; extra: string[] }) {
  const presets = FACILITIES.filter((f) => keys.includes(f.key));
  if (!presets.length && !extra.length) return null;
  return (
    <section className={s.fac}>
      <h2>Fasilitas</h2>
      <ul>
        {presets.map(({ key, label, Icon }) => (
          <li key={key}>
            <Icon size={20} stroke={1.5} aria-hidden="true" />
            {label}
          </li>
        ))}
        {extra.map((label) => (
          <li key={label}>
            <IconCheck size={20} stroke={1.5} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
