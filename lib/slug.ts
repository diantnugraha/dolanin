export const RESERVED_SLUGS: readonly string[] = ["kota", "promo", "cari", "admin", "go", "api"];

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug);
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uniqueSlug(base: string, taken: (s: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || "item";
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }
}
