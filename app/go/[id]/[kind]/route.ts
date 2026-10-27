import { NextResponse } from "next/server";
import { resolveGo } from "@/lib/tracking";

type Ctx = { params: Promise<{ id: string; kind: string }> };

async function go(req: Request, { params }: Ctx, record: boolean) {
  const { id, kind } = await params;
  const r = await resolveGo(id, kind, req.headers.get("user-agent"), { record });
  const res = r.status === 302 ? NextResponse.redirect(r.location, 302) : new NextResponse(null, { status: 404 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: Request, ctx: Ctx) {
  return go(req, ctx, true);
}

// Without this, Next answers HEAD with GET, so `curl -sI` and link checkers would count as clicks.
export async function HEAD(req: Request, ctx: Ctx) {
  return go(req, ctx, false);
}
