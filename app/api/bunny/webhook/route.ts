import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { fetchBunnyVideoLength, mapBunnyStatus } from "@/lib/media-server";

const ok = () => new Response(null, { status: 200 });

function tokenMatches(given: string | null): boolean {
  const want = process.env.BUNNY_WEBHOOK_TOKEN;
  if (!want || !given) return false; // fail closed
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(given), h(want));
}

// Bunny Stream status webhook. No requireAdmin: authenticated by the shared ?token= secret.
export async function POST(req: Request) {
  if (!tokenMatches(new URL(req.url).searchParams.get("token"))) return new Response(null, { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return ok();
  }
  const { VideoGuid: guid, Status: code } = (body ?? {}) as { VideoGuid?: unknown; Status?: unknown };
  if (typeof guid !== "string" || !guid || typeof code !== "number") return ok();
  const status = mapBunnyStatus(code);
  if (!status) return ok();

  const rows = await db.media.findMany({ where: { kind: "VIDEO", key: guid }, select: { id: true } });
  if (!rows.length) return ok();

  // Monotonic: READY and FAILED are terminal against in-progress codes; FAILED never overwrites READY;
  // READY is idempotent (a duplicate does not refetch or touch durationSec).
  const base = { kind: "VIDEO" as const, key: guid };
  if (status === "READY") {
    const where = { ...base, OR: [{ status: null }, { status: { not: "READY" as const } }] };
    if (!(await db.media.count({ where }))) return ok();
    const length = await fetchBunnyVideoLength(guid);
    await db.media.updateMany({ where, data: { status, ...(length !== null && { durationSec: length }) } });
  } else if (status === "FAILED") {
    await db.media.updateMany({
      where: { ...base, OR: [{ status: null }, { status: { not: "READY" } }] },
      data: { status },
    });
  } else {
    await db.media.updateMany({
      where: { ...base, OR: [{ status: null }, { status: { notIn: ["READY", "FAILED"] } }] },
      data: { status },
    });
  }
  return ok();
}
