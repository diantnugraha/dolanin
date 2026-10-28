// Isomorphic: safe for client components (type-only Prisma import).
import type { BookingChannel } from "../generated/prisma/client";

export type ChannelSlug = "agoda" | "traveloka" | "trip" | "tiket" | "booking" | "whatsapp";

/** Display order everywhere; matches the BookingChannel enum order in the schema. */
export const CHANNELS = [
  { id: "AGODA", slug: "agoda", label: "Agoda" },
  { id: "TRAVELOKA", slug: "traveloka", label: "Traveloka" },
  { id: "TRIP", slug: "trip", label: "Trip.com" },
  { id: "TIKET", slug: "tiket", label: "tiket.com" },
  { id: "BOOKING", slug: "booking", label: "Booking.com" },
  { id: "WHATSAPP", slug: "whatsapp", label: "WhatsApp" },
] as const satisfies readonly { id: BookingChannel; slug: ChannelSlug; label: string }[];

export type Channel = (typeof CHANNELS)[number];

export const channelBySlug = (slug: string): Channel | undefined => CHANNELS.find((c) => c.slug === slug);

export const channelById = (id: BookingChannel): Channel => CHANNELS.find((c) => c.id === id)!;

export const linkName = (id: BookingChannel): string =>
  id === "WHATSAPP" ? "Chat via WhatsApp" : `Pesan di ${channelById(id).label}`;
