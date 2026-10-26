import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { photoUrl, videoPoster, videoSrc } from "@/lib/media";

describe("media urls", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_CDN_URL", "https://cdn.example.com");
    vi.stubEnv("NEXT_PUBLIC_BUNNY_CDN_HOST", "vz-abc.b-cdn.net");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("builds photo urls per width", () => {
    expect(photoUrl("k1", 800)).toBe("https://cdn.example.com/k1-800.webp");
    expect(photoUrl("k1", 1600)).toBe("https://cdn.example.com/k1-1600.webp");
  });
  it("builds video src and poster", () => {
    expect(videoSrc("g-1")).toBe("https://vz-abc.b-cdn.net/g-1/play_720p.mp4");
    expect(videoPoster("g-1")).toBe("https://vz-abc.b-cdn.net/g-1/thumbnail.jpg");
  });
});
