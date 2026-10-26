import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  bunnyTusSignature,
  createPhotoUploadFor,
  createVideoUploadFor,
  deleteMediaObjects,
  mapBunnyStatus,
} from "@/lib/media-server";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));
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
  it("rejects NaN duration", () => expect(validateVideoMeta({ ...ok, durationSec: NaN })).toBe("durasi"));
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

const stubS3 = () => {
  vi.stubEnv("S3_BUCKET", "b");
  vi.stubEnv("S3_REGION", "ap-southeast-1");
  vi.stubEnv("AWS_ACCESS_KEY_ID", "id");
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "secret");
};
const stubBunny = () => {
  vi.stubEnv("BUNNY_LIBRARY_ID", "42");
  vi.stubEnv("BUNNY_API_KEY", "apikey");
};
beforeEach(() => {
  vi.mocked(getSignedUrl).mockReset();
  vi.mocked(getSignedUrl).mockImplementation(async (_c, cmd) => `https://signed.example/${(cmd as { input: { Key: string } }).input.Key}`);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("createPhotoUploadFor", () => {
  it("returns p/{uuid} key and two presigned webp PUT urls (600s)", async () => {
    stubS3();
    const r = await createPhotoUploadFor();
    expect(r.key).toMatch(/^p\/[0-9a-f-]{36}$/);
    expect(r.urls[800]).toBe(`https://signed.example/${r.key}-800.webp`);
    expect(r.urls[1600]).toBe(`https://signed.example/${r.key}-1600.webp`);
    const calls = vi.mocked(getSignedUrl).mock.calls;
    expect(calls).toHaveLength(2);
    for (const [, cmd, opts] of calls) {
      expect((cmd as { input: { ContentType: string; Bucket: string } }).input).toMatchObject({ ContentType: "image/webp", Bucket: "b" });
      expect(opts).toMatchObject({ expiresIn: 600 });
    }
  });
});

describe("createVideoUploadFor", () => {
  it("throws on Bunny non-2xx", async () => {
    stubBunny();
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("no", { status: 401 }));
    await expect(createVideoUploadFor("t")).rejects.toThrow("Gagal membuat video di Bunny (401).");
  });
  it("returns guid, libraryId, expires and matching signature", async () => {
    stubBunny();
    const f = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ guid: "g-1" }), { status: 200 }));
    const r = await createVideoUploadFor("Judul");
    expect(f.mock.calls[0][0]).toBe("https://video.bunnycdn.com/library/42/videos");
    expect((f.mock.calls[0][1] as RequestInit).headers).toMatchObject({ AccessKey: "apikey" });
    expect(r).toMatchObject({ guid: "g-1", libraryId: "42" });
    expect(r.expires).toBeGreaterThan(Date.now() / 1000 + 3600);
    expect(r.signature).toBe(bunnyTusSignature("42", "apikey", r.expires, "g-1"));
  });
  it("throws a clear error when env missing", async () => {
    vi.stubEnv("BUNNY_LIBRARY_ID", "");
    await expect(createVideoUploadFor("t")).rejects.toThrow("Bunny Stream belum dikonfigurasi (BUNNY_*).");
  });
});

describe("deleteMediaObjects", () => {
  it("photo: deletes both -800 and -1600 keys", async () => {
    stubS3();
    const send = vi.spyOn(S3Client.prototype, "send").mockResolvedValue({} as never);
    await deleteMediaObjects([{ kind: "PHOTO", key: "p/abc" }]);
    const input = (send.mock.calls[0][0] as unknown as { input: { Delete: { Objects: { Key: string }[] } } }).input;
    expect(input.Delete.Objects.map((o) => o.Key)).toEqual(["p/abc-800.webp", "p/abc-1600.webp"]);
  });
  it("photo: S3 per-key Errors[] throws naming keys", async () => {
    stubS3();
    vi.spyOn(S3Client.prototype, "send").mockResolvedValue({ Errors: [{ Key: "p/abc-800.webp", Code: "AccessDenied" }] } as never);
    await expect(deleteMediaObjects([{ kind: "PHOTO", key: "p/abc" }])).rejects.toThrow("p/abc-800.webp");
  });
  it("video: Bunny 404 tolerated, 500 throws, uses DELETE", async () => {
    stubBunny();
    const f = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    await expect(deleteMediaObjects([{ kind: "VIDEO", key: "g" }])).resolves.toBeUndefined();
    expect(f.mock.calls[0][0]).toBe("https://video.bunnycdn.com/library/42/videos/g");
    expect((f.mock.calls[0][1] as RequestInit).method).toBe("DELETE");
    f.mockResolvedValue(new Response(null, { status: 500 }));
    await expect(deleteMediaObjects([{ kind: "VIDEO", key: "g" }])).rejects.toThrow("(500)");
  });
});
