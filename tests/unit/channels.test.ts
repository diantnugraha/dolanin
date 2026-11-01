import { describe, expect, it } from "vitest";
import { CHANNELS, channelById, channelBySlug, linkName } from "@/lib/channels";

describe("booking channels", () => {
  it("fixed order, slugs and labels", () => {
    expect(CHANNELS.map((c) => c.slug)).toEqual(["agoda", "traveloka", "trip", "tiket", "booking", "airbnb", "tiktok", "whatsapp"]);
    expect(CHANNELS.map((c) => c.label)).toEqual([
      "Agoda", "Traveloka", "Trip.com", "tiket.com", "Booking.com", "Airbnb", "TikTok", "WhatsApp",
    ]);
    expect(CHANNELS.map((c) => c.id)).toEqual(["AGODA", "TRAVELOKA", "TRIP", "TIKET", "BOOKING", "AIRBNB", "TIKTOK", "WHATSAPP"]);
  });

  it("looks channels up by slug and id", () => {
    expect(channelBySlug("tiket")?.id).toBe("TIKET");
    expect(channelBySlug("pesan")).toBeUndefined();
    expect(channelById("BOOKING").slug).toBe("booking");
  });

  it("names links for screen readers", () => {
    expect(linkName("TRIP")).toBe("Pesan di Trip.com");
    expect(linkName("AIRBNB")).toBe("Pesan di Airbnb");
    expect(linkName("TIKTOK")).toBe("Pesan di TikTok");
    expect(linkName("WHATSAPP")).toBe("Chat via WhatsApp");
  });
});
