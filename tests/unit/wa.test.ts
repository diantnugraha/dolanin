import { describe, expect, it } from "vitest";
import { GENERAL_WA_TEXT, normalizeWaNumber, waLink } from "@/lib/wa";

describe("wa", () => {
  it("normalizes numbers", () => {
    expect(normalizeWaNumber("0812-3456-7890")).toBe("6281234567890");
    expect(normalizeWaNumber("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizeWaNumber("812 3456 7890")).toBe("6281234567890");
    expect(normalizeWaNumber("021-5551234")).toBeNull();
    expect(normalizeWaNumber("12345")).toBeNull();
  });
  it("builds links and texts", () => {
    expect(
      waLink("6281234567890", "Halo, saya tertarik dengan Omah Tugu Inn di Dolanin: https://dolanin.id/yogyakarta/omah-tugu-inn"),
    ).toBe(
      "https://wa.me/6281234567890?text=Halo%2C%20saya%20tertarik%20dengan%20Omah%20Tugu%20Inn%20di%20Dolanin%3A%20https%3A%2F%2Fdolanin.id%2Fyogyakarta%2Fomah-tugu-inn",
    );
    expect(GENERAL_WA_TEXT).toBe("Halo Dolanin, saya mau tanya penginapan.");
  });
});
