import { isBot, recordEvent } from "@/lib/tracking";

const MAX_BODY = 64;
const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

// ViewBeacon posts the bare listing id as text/plain. Always 204 so ids cannot be probed.
export async function POST(req: Request) {
  if (isBot(req.headers.get("user-agent"))) return noContent();
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) return noContent();
  const id = (await req.text()).trim();
  if (!id || id.length > MAX_BODY) return noContent();
  try {
    await recordEvent(id, "VIEW");
  } catch (e) {
    console.error("tracking: view record failed", e);
  }
  return noContent();
}
