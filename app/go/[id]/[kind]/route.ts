import { NextResponse } from "next/server";
import { resolveGo } from "@/lib/tracking";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  const { id, kind } = await params;
  const r = await resolveGo(id, kind, req.headers.get("user-agent"));
  const res = r.status === 302 ? NextResponse.redirect(r.location, 302) : new NextResponse(null, { status: 404 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
