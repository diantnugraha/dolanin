import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bunnyTusSignature, createPhotoUploadFor, mapBunnyStatus } from "@/lib/media-server";
import { validateVideoMeta } from "@/components/admin/upload";

const ok = { durationSec: 30, width: 1080, height: 1920, sizeBytes: 20e6, mime: "video/mp4" };

describe("bunnyTusSignature", () => {
  it("is sha256 hex of libraryId+apiKey+expires+guid", () => {
    expect(bunnyTusSignature("1", "k", 100, "g")).toBe(createHash("sha256").update("1k100g").digest("hex"));
  });
});

describe("validateVideoMeta", () => {
  it("accepts a valid 9:16 clip", () => expect(validateVideoMeta(ok)).toBeNull());
  it("rejects long duration", () => expect(validateVideoMeta({ ...ok, durationSec: 61 })).toBe("durasi"));
  it("accepts 60.4s", () => expect(validateVideoMeta({ ...ok, durationSec: 60.4 })).toBeNull());
  it("rejects landscape", () => expect(validateVideoMeta({ ...ok, width: 1920, height: 1080 })).toBe("rasio"));
  it("rejects huge file", () => expect(validateVideoMeta({ ...ok, sizeBytes: 301e6 })).toBe("ukuran"));
  it("rejects non-video", () => expect(validateVideoMeta({ ...ok, mime: "image/png" })).toBe("format"));
});

describe("mapBunnyStatus", () => {
  it("maps finished/failed/in-progress/other", () => {
    expect(mapBunnyStatus(3)).toBe("READY");
    expect(mapBunnyStatus(5)).toBe("FAILED");
    expect(mapBunnyStatus(8)).toBe("FAILED");
    for (const c of [0, 1, 2, 4, 6, 7]) expect(mapBunnyStatus(c)).toBe("PROCESSING");
    for (const c of [9, 10, 11, 32, 99]) expect(mapBunnyStatus(c)).toBeNull();
  });
});

describe("missing env", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("photo upload throws a clear error", async () => {
    vi.stubEnv("S3_BUCKET", "");
    await expect(createPhotoUploadFor()).rejects.toThrow("Penyimpanan foto belum dikonfigurasi (S3_*).");
  });
});
