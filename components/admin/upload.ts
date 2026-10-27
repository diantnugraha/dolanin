"use client";

import * as tus from "tus-js-client";
import { createPhotoUpload, createVideoUpload } from "@/app/admin/media-actions";

export type VideoMeta = { durationSec: number; width: number; height: number; sizeBytes: number; mime: string };
export type VideoProblem = "durasi" | "rasio" | "ukuran" | "format";

export const VIDEO_ERRORS: Record<VideoProblem, string> = {
  durasi: "Video maksimal 4 menit.",
  rasio: "Video harus vertikal 9:16.",
  ukuran: "Ukuran video maksimal 300 MB.",
  format: "File ini bukan video.",
};

export function validateVideoMeta(m: VideoMeta): VideoProblem | null {
  if (!m.mime.startsWith("video/")) return "format";
  if (!(m.durationSec <= 240.5)) return "durasi";
  const ratio = m.height > 0 ? m.width / m.height : 0;
  if (ratio < 0.54 || ratio > 0.585) return "rasio";
  if (m.sizeBytes > 300e6) return "ukuran";
  return null;
}

export const WEBP_UNSUPPORTED =
  "Browser ini tidak bisa membuat foto WebP. Pakai Chrome atau Firefox untuk mengunggah foto.";

export async function resizeToWebp(file: File, maxW: 800 | 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bmp.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error("Gagal memproses foto."));
        // Safari cannot encode WebP and silently returns a (huge) PNG instead.
        if (b.type !== "image/webp") return reject(new Error(WEBP_UNSUPPORTED));
        resolve(b);
      },
      "image/webp",
      0.82,
    ),
  );
}

export async function uploadPhoto(file: File): Promise<{ key: string }> {
  const { key, urls, headers } = await createPhotoUpload();
  for (const w of [800, 1600] as const) {
    const body = await resizeToWebp(file, w);
    // Content-Type and Cache-Control are signed into the URL: send exactly what the server signed.
    const res = await fetch(urls[w], { method: "PUT", headers, body });
    if (!res.ok) throw new Error("Gagal mengunggah foto.");
  }
  return { key };
}

export function readVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      resolve({ durationSec: v.duration, width: v.videoWidth, height: v.videoHeight, sizeBytes: file.size, mime: file.type });
      URL.revokeObjectURL(url);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("File ini bukan video."));
    };
    v.src = url;
  });
}

export async function uploadVideo(
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ guid: string; durationSec: number }> {
  const meta = await readVideoMeta(file);
  const problem = validateVideoMeta(meta);
  if (problem) throw new Error(VIDEO_ERRORS[problem]);
  const { guid, libraryId, expires, signature } = await createVideoUpload(file.name);
  await new Promise<void>((resolve, reject) => {
    new tus.Upload(file, {
      endpoint: "https://video.bunnycdn.com/tusupload",
      retryDelays: [0, 3000, 5000, 10000],
      headers: {
        AuthorizationSignature: signature,
        AuthorizationExpire: String(expires),
        VideoId: guid,
        LibraryId: libraryId,
      },
      metadata: { filetype: file.type, title: file.name },
      onError: () => reject(new Error("Gagal mengunggah video.")),
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    }).start();
  });
  return { guid, durationSec: Math.round(meta.durationSec) };
}
