import { describe, expect, it } from "vitest";
import { listingInput } from "@/lib/validation";
import { isPromo } from "@/lib/listing";

const base = {
  name: "Omah Tugu Inn", cityId: "c1", type: "HOTEL", area: "Tugu", price: "185.000",
  description: "Nyaman", facilities: [], extraFacilities: [], links: { AGODA: "https://x.com/a" },
  published: false, featured: false, media: [],
};
const err = (o: object) => {
  const r = listingInput.safeParse({ ...base, ...o });
  if (r.success) return null;
  const m: Record<string, string> = {};
  for (const i of r.error.issues) m[i.path[0] === "links" && i.path[1] ? `links.${String(i.path[1])}` : String(i.path[0])] ??= i.message;
  return m;
};

describe("listingInput", () => {
  it("valid base", () => expect(listingInput.safeParse(base).success).toBe(true));
  it("name required", () => expect(err({ name: " " })?.name).toBe("Nama wajib diisi"));
  it("parses price", () => {
    const r = listingInput.parse(base);
    expect(r.price).toBe(185000);
  });
  it("min price", () => expect(err({ price: "5000" })?.price).toBe("Harga minimal Rp10.000"));
  it("normal price lower is not an error", () => {
    const r = listingInput.safeParse({ ...base, normalPrice: "150.000" });
    expect(r.success).toBe(true);
    if (r.success) expect(isPromo({ price: r.data.price, normalPrice: r.data.normalPrice ?? null })).toBe(false);
  });
  it("urls http(s) only", () => {
    const m = "Link harus diawali http:// atau https://";
    expect(err({ links: { TRIP: "javascript:alert(1)" } })?.["links.TRIP"]).toBe(m);
    expect(err({ mapsUrl: "javascript:alert(1)" })?.mapsUrl).toBe(m);
  });
  it("booking links: empty ones are dropped", () => {
    expect(listingInput.parse({ ...base, links: { AGODA: "", WHATSAPP: "https://wa.me/62812" } }).links).toEqual({
      WHATSAPP: "https://wa.me/62812",
    });
  });
  it("booking links: a published listing needs at least one, a draft does not", () => {
    expect(err({ published: true, links: {} })?.links).toBe("Isi minimal satu link pemesanan");
    expect(err({ published: true, links: { AGODA: " " } })?.links).toBe("Isi minimal satu link pemesanan");
    expect(listingInput.safeParse({ ...base, published: false, links: {} }).success).toBe(true);
  });
  it("booking links: unknown channels are rejected", () => {
    expect(err({ links: { EXPEDIA: "https://x.com" } })).not.toBeNull();
  });
  it("description max", () => {
    expect(err({ description: "a".repeat(301) })?.description).toBe("Deskripsi maksimal 300 karakter");
  });
  it("facilities", () => {
    expect(err({ facilities: ["jacuzzi"] })).not.toBeNull();
    expect(err({ extraFacilities: ["a", "b", "c", "d", "e", "f"] })).not.toBeNull();
    expect(err({ extraFacilities: ["a".repeat(31)] })).not.toBeNull();
  });
  it("published needs media", () => {
    expect(err({ published: true })?.media).toBe("Tambahkan minimal 1 foto atau video");
    expect(err({ published: false })).toBeNull();
    expect(err({ published: true, media: [{ kind: "VIDEO", key: "g", sortOrder: 0 }] })).toBeNull();
  });
});
