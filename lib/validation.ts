import { z } from "zod";
import { parseRupiah } from "./format";
import { normalizeWaNumber } from "./wa";
import { FACILITIES } from "./listing";

const URL_MSG = "Link harus diawali http:// atau https://";
const httpUrl = z
  .string()
  .trim()
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, URL_MSG);

const rupiah = (min: number, minMsg: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = parseRupiah(v);
      if (n === null || n < min) {
        ctx.addIssue({ code: "custom", message: n === null ? "Harga tidak valid" : minMsg });
        return z.NEVER;
      }
      return n;
    });

const empty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const listingInput = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi").max(100, "Nama maksimal 100 karakter"),
    cityId: z.string().min(1, "Pilih kota"),
    type: z.enum(["HOTEL", "PENGINAPAN", "VILLA"], "Pilih tipe"),
    area: z.string().trim().min(1, "Area wajib diisi").max(100, "Area maksimal 100 karakter"),
    mapsUrl: z.preprocess(empty, httpUrl.optional()),
    price: rupiah(10_000, "Harga minimal Rp10.000"),
    normalPrice: z.preprocess(empty, rupiah(10_000, "Harga minimal Rp10.000").optional()),
    description: z.string().trim().min(1, "Deskripsi wajib diisi").max(300, "Deskripsi maksimal 300 karakter"),
    facilities: z.array(z.enum(FACILITIES.map((f) => f.key) as [string, ...string[]], "Fasilitas tidak dikenal")),
    extraFacilities: z
      .array(z.string().trim().min(1, "Fasilitas tidak boleh kosong").max(30, "Maksimal 30 karakter"))
      .max(5, "Maksimal 5 fasilitas lainnya"),
    affiliateUrl: httpUrl,
    waNumber: z.preprocess(
      empty,
      z
        .string()
        .transform((v, ctx) => {
          const n = normalizeWaNumber(v);
          if (!n) {
            ctx.addIssue({ code: "custom", message: "Nomor WhatsApp tidak valid" });
            return z.NEVER;
          }
          return n;
        })
        .optional(),
    ),
    published: z.boolean(),
    featured: z.boolean(),
    media: z.array(
      z.object({
        kind: z.enum(["PHOTO", "VIDEO"]),
        key: z.string().min(1),
        sortOrder: z.number().int(),
      }),
    ),
  })
  .superRefine((v, ctx) => {
    if (v.published && v.media.length === 0) {
      ctx.addIssue({ code: "custom", path: ["media"], message: "Tambahkan minimal 1 foto atau video" });
    }
  });

export type ListingInput = z.output<typeof listingInput>;

export const cityInput = z.object({
  name: z.string().trim().min(2, "Nama kota 2–40 karakter").max(40, "Nama kota 2–40 karakter"),
  code: z.string().regex(/^[A-Z]{2,4}$/, "Kode 2–4 huruf besar"),
  photoKey: z.preprocess(empty, z.string().min(1).optional()),
  sortOrder: z.coerce.number("Urutan harus berupa angka").int("Urutan harus bilangan bulat").min(0, "Urutan minimal 0"),
});

export type CityInput = z.output<typeof cityInput>;
