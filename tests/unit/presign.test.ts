// Real presigner, fake credentials: signing is offline HMAC, no network call is made.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPhotoUploadFor, PHOTO_CACHE_CONTROL } from "@/lib/media-server";

beforeEach(() => {
  vi.stubEnv("S3_BUCKET", "test-bucket");
  vi.stubEnv("S3_REGION", "ap-southeast-1");
  vi.stubEnv("AWS_ACCESS_KEY_ID", "test");
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "test");
});
afterEach(() => vi.unstubAllEnvs());

describe("createPhotoUploadFor (real getSignedUrl)", () => {
  it("presigned PUT urls carry no SDK checksum fields (S3 would reject any real body)", async () => {
    const { key, urls } = await createPhotoUploadFor();
    for (const w of [800, 1600] as const) {
      const u = new URL(urls[w]);
      expect(u.pathname).toBe(`/${key}-${w}.webp`);
      expect(u.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
      expect(urls[w]).not.toMatch(/x-amz-checksum-crc32/i);
      expect(urls[w]).not.toMatch(/x-amz-sdk-checksum-algorithm/i);
    }
  });

  it("signs Content-Type and the immutable Cache-Control the browser must send", async () => {
    const { urls, headers } = await createPhotoUploadFor();
    expect(PHOTO_CACHE_CONTROL).toBe("public, max-age=31536000, immutable");
    expect(headers).toEqual({ "Content-Type": "image/webp", "Cache-Control": PHOTO_CACHE_CONTROL });
    for (const w of [800, 1600] as const) {
      expect(new URL(urls[w]).searchParams.get("X-Amz-SignedHeaders")).toBe("cache-control;content-type;host");
    }
  });

  it("S3_ENDPOINT (Bunny Storage) signs path-style urls against that host and region", async () => {
    vi.stubEnv("S3_ENDPOINT", "https://de-s3.storage.bunnycdn.com");
    vi.stubEnv("S3_REGION", "de");
    const { key, urls } = await createPhotoUploadFor();
    const u = new URL(urls[800]);
    expect(u.host).toBe("de-s3.storage.bunnycdn.com");
    expect(u.pathname).toBe(`/test-bucket/${key}-800.webp`);
    expect(u.searchParams.get("X-Amz-Credential")).toMatch(/\/de\/s3\/aws4_request$/);
  });
});
