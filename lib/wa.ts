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
