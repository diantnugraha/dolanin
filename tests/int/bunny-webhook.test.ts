import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import * as route from "@/app/api/bunny/webhook/route";
import { resetDb, seedBasic } from "./setup";

const TOKEN = "tok-123";
const { POST } = route;
const call = (body: unknown, token: string | null = TOKEN, raw?: string) =>
  POST(
    new Request(`http://x/api/bunny/webhook${token === null ? "" : `?token=${token}`}`, {
      method: "POST",
      body: raw ?? JSON.stringify(body),
    }),
  );

let mediaId: string;
beforeEach(async () => {
  await resetDb();
  await seedBasic();
  vi.stubEnv("BUNNY_WEBHOOK_TOKEN", TOKEN);
  vi.stubEnv("BUNNY_LIBRARY_ID", "42");
  vi.stubEnv("BUNNY_API_KEY", "key");
  const l = await db.listing.findFirstOrThrow();
  const m = await db.media.create({
    data: { listingId: l.id, kind: "VIDEO", key: "guid-1", status: "PROCESSING", sortOrder: 99 },
  });
  mediaId = m.id;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("bunny webhook", () => {
  it("wrong token -> 401", async () => {
    expect((await call({ VideoGuid: "guid-1", Status: 3 }, "nope")).status).toBe(401);
    expect((await call({ VideoGuid: "guid-1", Status: 3 }, null)).status).toBe(401);
    expect((await db.media.findUniqueOrThrow({ where: { id: mediaId } })).status).toBe("PROCESSING");
  });

  it("missing env token fails closed", async () => {
    vi.stubEnv("BUNNY_WEBHOOK_TOKEN", "");
    expect((await call({ VideoGuid: "guid-1", Status: 3 }, "")).status).toBe(401);
  });

  it("finished -> READY with durationSec from Bunny", async () => {
    const f = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ length: 37 }), { status: 200 }));
    expect((await call({ VideoLibraryId: 42, VideoGuid: "guid-1", Status: 3 })).status).toBe(200);
    expect(String(f.mock.calls[0][0])).toBe("https://video.bunnycdn.com/library/42/videos/guid-1");
    const m = await db.media.findUniqueOrThrow({ where: { id: mediaId } });
    expect(m).toMatchObject({ status: "READY", durationSec: 37 });
  });

  it("finished but Bunny GET fails -> still READY, duration null", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("net"));
    expect((await call({ VideoGuid: "guid-1", Status: 3 })).status).toBe(200);
    expect(await db.media.findUniqueOrThrow({ where: { id: mediaId } })).toMatchObject({ status: "READY", durationSec: null });
  });

  it("failed -> FAILED", async () => {
    expect((await call({ VideoGuid: "guid-1", Status: 5 })).status).toBe(200);
    expect((await db.media.findUniqueOrThrow({ where: { id: mediaId } })).status).toBe("FAILED");
  });

  it("unknown guid -> 200 no-op", async () => {
    const f = vi.spyOn(global, "fetch");
    expect((await call({ VideoGuid: "zzz", Status: 3 })).status).toBe(200);
    expect(f).not.toHaveBeenCalled();
    expect((await db.media.findUniqueOrThrow({ where: { id: mediaId } })).status).toBe("PROCESSING");
  });

  it("malformed JSON / unknown status -> 200 no-op", async () => {
    expect((await call(null, TOKEN, "{not json")).status).toBe(200);
    expect((await call({ VideoGuid: "guid-1", Status: 99 })).status).toBe(200);
    expect((await db.media.findUniqueOrThrow({ where: { id: mediaId } })).status).toBe("PROCESSING");
  });

  it("only POST", () => {
    expect(Object.keys(route)).toEqual(["POST"]);
  });
});
