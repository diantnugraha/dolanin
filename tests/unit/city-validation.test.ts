import { describe, expect, it } from "vitest";
import { cityInput } from "@/lib/validation";

const base = { name: "Yogyakarta", code: "YK", sortOrder: 0 };
const err = (o: object) => {
  const r = cityInput.safeParse({ ...base, ...o });
  if (r.success) return null;
  const m: Record<string, string> = {};
  for (const i of r.error.issues) m[String(i.path[0])] ??= i.message;
  return m;
};

describe("cityInput", () => {
  it("accepts a valid city", () => {
    expect(err({})).toBeNull();
    expect(err({ photoKey: "p/abc" })).toBeNull();
  });
  it("name 2-40 chars", () => {
    expect(err({ name: "A" })?.name).toBe("Nama kota 2–40 karakter");
    expect(err({ name: "x".repeat(41) })?.name).toBe("Nama kota 2–40 karakter");
    expect(err({ name: "  " })?.name).toBe("Nama kota 2–40 karakter");
  });
  it("code must be 2-4 uppercase letters", () => {
    for (const code of ["yk", "Y", "YKYKY", "Y1", ""]) expect(err({ code })?.code).toBe("Kode 2–4 huruf besar");
    expect(err({ code: "BALI" })).toBeNull();
  });
  it("sortOrder is an integer >= 0, strings coerced", () => {
    expect(err({ sortOrder: -1 })?.sortOrder).toBeTruthy();
    expect(err({ sortOrder: 1.5 })?.sortOrder).toBeTruthy();
    expect(err({ sortOrder: "3" })).toBeNull();
    expect(cityInput.parse({ ...base, sortOrder: "3" }).sortOrder).toBe(3);
  });
  it("empty photoKey becomes undefined", () => {
    expect(cityInput.parse({ ...base, photoKey: "" }).photoKey).toBeUndefined();
  });
});
