import { describe, expect, it } from "vitest";
import { GENERAL_WA_TEXT, listingWaText, normalizeWaNumber, waLink, withWaText } from "@/lib/wa";

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
    expect(listingWaText("Omah Tugu Inn", "https://x.id/a")).toBe("Halo, saya tertarik dengan Omah Tugu Inn di Dolanin: https://x.id/a");
  });
  it("adds the listing text to a WhatsApp link that has none", () => {
    const t = "Halo, saya tertarik dengan Omah Tugu Inn di Dolanin: https://x.id/a";
    const enc = "Halo%2C+saya+tertarik+dengan+Omah+Tugu+Inn+di+Dolanin%3A+https%3A%2F%2Fx.id%2Fa";
    expect(withWaText("https://wa.me/6281234567890", t)).toBe(`https://wa.me/6281234567890?text=${enc}`);
    expect(withWaText("https://api.whatsapp.com/send?phone=6281234567890", t)).toBe(
      `https://api.whatsapp.com/send?phone=6281234567890&text=${enc}`,
    );
    expect(new URL(withWaText("https://wa.me/6281234567890", t)).searchParams.get("text")).toBe(t);
  });
  it("keeps the admin's own text and leaves other links alone", () => {
    const t = "auto";
    expect(withWaText("https://wa.me/6281234567890?text=Halo%20admin", t)).toBe("https://wa.me/6281234567890?text=Halo%20admin");
    expect(withWaText("https://wa.link/abc123", t)).toBe("https://wa.link/abc123");
    expect(withWaText("https://example.com/wa", t)).toBe("https://example.com/wa");
    expect(withWaText("not a url", t)).toBe("not a url");
  });
});
