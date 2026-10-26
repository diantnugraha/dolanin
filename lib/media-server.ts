import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { MediaKind, VideoStatus } from "@/generated/prisma/client";

/*
 * Bunny Stream facts, checked 2026-10-27 against bunny.net/docs (docs.bunny.net redirects there):
 * - Create video: POST https://video.bunnycdn.com/library/{libraryId}/videos, header `AccessKey`,
 *   JSON body {title}; 200 returns VideoModel with `guid`, `length` (seconds), `status`.
 *   https://bunny.net/docs/reference/video_createvideo
 * - Delete video: DELETE https://video.bunnycdn.com/library/{libraryId}/videos/{guid}, header `AccessKey`.
 *   https://bunny.net/docs/reference/video_deletevideo
 * - TUS: endpoint https://video.bunnycdn.com/tusupload; headers AuthorizationSignature, AuthorizationExpire
 *   (unix seconds, keep >= 3600s ahead), LibraryId, VideoId. Signature = SHA256 hex of
 *   libraryId + apiKey + expire + videoId (no separators), computed on the server.
 *   https://bunny.net/docs/reference/tus-resumable-uploads
 * - Webhook: POST JSON {VideoLibraryId, VideoGuid, Status}. Status 0 Queued, 1 Processing, 2 Encoding,
 *   3 Finished, 4 Resolution finished (playable, not complete), 5 Failed, 6/7/8 presigned upload
 *   started/finished/failed, 9 CaptionsGenerated, 10 TitleOrDescriptionGenerated. Payload has no
 *   duration, so we GET the video. https://bunny.net/docs/stream/webhooks
 * - NOT verified from official pages (404/unreachable; only search snippets + community examples):
 *   MP4 fallback `https://{stream-cdn-host}/{guid}/play_720p.mp4` and `.../{guid}/thumbnail.jpg`;
 *   the library must have "MP4 Fallback" enabled (Stream > Library > Encoding), and only videos uploaded
 *   AFTER enabling get MP4 files. https://bunny.net/docs/stream/mp4-downloads
 */

const BUNNY_API = "https://video.bunnycdn.com";
const TUS_EXPIRE_SEC = 4 * 60 * 60;
const PHOTO_PUT_EXPIRES_SEC = 600;

export function bunnyTusSignature(libraryId: string, apiKey: string, expires: number, guid: string): string {
  return createHash("sha256").update(`${libraryId}${apiKey}${expires}${guid}`).digest("hex");
}

export function mapBunnyStatus(code: number): VideoStatus | null {
  if (code === 3) return "READY";
  if (code === 5 || code === 8) return "FAILED";
  if (code >= 0 && code <= 2) return "PROCESSING";
  if (code === 4 || code === 6 || code === 7) return "PROCESSING";
  return null;
}

function s3Config() {
  const { S3_BUCKET: bucket, S3_REGION: region, AWS_ACCESS_KEY_ID: id, AWS_SECRET_ACCESS_KEY: secret } = process.env;
  if (!bucket || !region || !id || !secret) throw new Error("Penyimpanan foto belum dikonfigurasi (S3_*).");
  return { bucket, client: new S3Client({ region, credentials: { accessKeyId: id, secretAccessKey: secret } }) };
}

export function bunnyConfig() {
  const { BUNNY_LIBRARY_ID: libraryId, BUNNY_API_KEY: apiKey } = process.env;
  if (!libraryId || !apiKey) throw new Error("Bunny Stream belum dikonfigurasi (BUNNY_*).");
  return { libraryId, apiKey };
}

export async function createPhotoUploadFor(): Promise<{ key: string; urls: { 800: string; 1600: string } }> {
  const { bucket, client } = s3Config();
  const key = `p/${randomUUID()}`;
  const put = (w: 800 | 1600) =>
    getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: `${key}-${w}.webp`, ContentType: "image/webp" }), {
      expiresIn: PHOTO_PUT_EXPIRES_SEC,
    });
  const [u800, u1600] = await Promise.all([put(800), put(1600)]);
  return { key, urls: { 800: u800, 1600: u1600 } };
}

export async function createVideoUploadFor(
  title: string,
): Promise<{ guid: string; libraryId: string; expires: number; signature: string }> {
  const { libraryId, apiKey } = bunnyConfig();
  const res = await fetch(`${BUNNY_API}/library/${libraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ title: title.trim().slice(0, 200) || "Video" }),
  });
  if (!res.ok) throw new Error(`Gagal membuat video di Bunny (${res.status}).`);
  const { guid } = (await res.json()) as { guid?: string };
  if (!guid) throw new Error("Gagal membuat video di Bunny.");
  const expires = Math.floor(Date.now() / 1000) + TUS_EXPIRE_SEC;
  return { guid, libraryId, expires, signature: bunnyTusSignature(libraryId, apiKey, expires, guid) };
}

export async function fetchBunnyVideoLength(guid: string): Promise<number | null> {
  const { libraryId, apiKey } = bunnyConfig();
  try {
    const res = await fetch(`${BUNNY_API}/library/${libraryId}/videos/${encodeURIComponent(guid)}`, {
      headers: { AccessKey: apiKey, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const { length } = (await res.json()) as { length?: unknown };
    return typeof length === "number" && Number.isFinite(length) ? Math.round(length) : null;
  } catch {
    return null;
  }
}

export async function deleteMediaObjects(items: { kind: MediaKind; key: string }[]): Promise<void> {
  const photos = items.filter((i) => i.kind === "PHOTO");
  const videos = items.filter((i) => i.kind === "VIDEO");
  if (photos.length) {
    const { bucket, client } = s3Config();
    const Objects = photos.flatMap((p) => [{ Key: `${p.key}-800.webp` }, { Key: `${p.key}-1600.webp` }]);
    for (let i = 0; i < Objects.length; i += 1000) {
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: Objects.slice(i, i + 1000), Quiet: true } }));
    }
  }
  if (videos.length) {
    const { libraryId, apiKey } = bunnyConfig();
    for (const v of videos) {
      const res = await fetch(`${BUNNY_API}/library/${libraryId}/videos/${encodeURIComponent(v.key)}`, {
        method: "DELETE",
        headers: { AccessKey: apiKey },
      });
      if (!res.ok && res.status !== 404) throw new Error(`Gagal menghapus video di Bunny (${res.status}).`);
    }
  }
}

