export const GENERAL_WA_TEXT = "Halo Dolanin, saya mau tanya penginapan.";

export function normalizeWaNumber(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("62")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  const full = `62${d}`;
  return /^628\d{8,11}$/.test(full) ? full : null;
}

export function waLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function listingWaText(name: string, url: string): string {
  return `Halo, saya tertarik dengan ${name} di Dolanin: ${url}`;
}

const WA_HOSTS = new Set(["wa.me", "api.whatsapp.com", "whatsapp.com", "www.whatsapp.com"]);

/** Adds `text` to a wa.me / api.whatsapp.com link that has none. The admin's own text and other links
 *  (e.g. wa.link short links, which redirect elsewhere) are returned as is. */
export function withWaText(link: string, text: string): string {
  let u: URL;
  try {
    u = new URL(link);
  } catch {
    return link;
  }
  if (!WA_HOSTS.has(u.hostname.toLowerCase()) || u.searchParams.has("text")) return link;
  u.searchParams.set("text", text);
  return u.toString();
}
