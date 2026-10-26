import { afterEach, describe, expect, it, vi } from "vitest";
import { resizeToWebp, WEBP_UNSUPPORTED } from "@/components/admin/upload";

/** Fake canvas whose toBlob encodes to `type` (Safari silently falls back to PNG for "image/webp"). */
function stubCanvas(type: string) {
  vi.stubGlobal("createImageBitmap", async () => ({ width: 2000, height: 1000, close: () => {} }));
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(["x"], { type })),
    }),
  });
}
const file = () => new File(["x"], "foto.png", { type: "image/png" });

afterEach(() => vi.unstubAllGlobals());

describe("resizeToWebp", () => {
  it("rejects when the browser encodes PNG instead of WebP", async () => {
    stubCanvas("image/png");
    const msg = "Browser ini tidak bisa membuat foto WebP. Pakai Chrome atau Firefox untuk mengunggah foto.";
    await expect(resizeToWebp(file(), 800)).rejects.toThrow(msg);
    expect(WEBP_UNSUPPORTED).toBe(msg);
  });

  it("resolves the WebP blob when the browser supports it", async () => {
    stubCanvas("image/webp");
    expect((await resizeToWebp(file(), 800)).type).toBe("image/webp");
  });
});
