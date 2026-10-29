import { describe, expect, it } from "vitest";
import { CHANNELS, channelById, channelBySlug, linkName } from "@/lib/channels";

describe("booking channels", () => {
  it("fixed order, slugs and labels", () => {
    expect(CHANNELS.map((c) => c.slug)).toEqual(["agoda", "traveloka", "trip", "tiket", "booking", "whatsapp"]);
    expect(CHANNELS.map((c) => c.label)).toEqual(["Agoda", "Traveloka", "Trip.com", "tiket.com", "Booking.com", "WhatsApp"]);
    expect(CHANNELS.map((c) => c.id)).toEqual(["AGODA", "TRAVELOKA", "TRIP", "TIKET", "BOOKING", "WHATSAPP"]);
  });

  it("looks channels up by slug and id", () => {
    expect(channelBySlug("tiket")?.id).toBe("TIKET");
    expect(channelBySlug("pesan")).toBeUndefined();
    expect(channelById("BOOKING").slug).toBe("booking");
  });

  it("names links for screen readers", () => {
    expect(linkName("TRIP")).toBe("Pesan di Trip.com");
    expect(linkName("WHATSAPP")).toBe("Chat via WhatsApp");
  });
});
