// Runs the real migration SQL on a throwaway database: old rows in, converted rows out.
import { readdirSync, readFileSync } from "node:fs";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DIR = "prisma/migrations";
const NAME = readdirSync(DIR).find((d) => d.endsWith("_booking_channels"));
const sql = (dir: string) => readFileSync(`${DIR}/${dir}/migration.sql`, "utf8");
const TMP = "dolanin_migration_test";

let db: Client;

async function admin(query: string) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query(query);
  } finally {
    await c.end();
  }
}

async function listing(id: string, affiliateUrl: string, waNumber: string | null) {
  await db.query(
    `INSERT INTO "Listing" (id, name, slug, "cityId", type, area, price, description, facilities, "extraFacilities",
       "affiliateUrl", "waNumber", published, "updatedAt")
     VALUES ($1, $1, $1, 'c', 'HOTEL', 'a', 100000, 'd', '{}', '{}', $2, $3, true, now())`,
    [id, affiliateUrl, waNumber],
  );
}

async function event(listingId: string, kind: string) {
  await db.query(
    `INSERT INTO "Event" ("listingId", kind, "cityId", type) VALUES ($1, $2::"EventKind", 'c', 'HOTEL')`,
    [listingId, kind],
  );
}

const links = async (id: string) =>
  (await db.query(`SELECT channel::text, url FROM "ListingLink" WHERE "listingId" = $1 ORDER BY channel`, [id])).rows;
const legacy = async (id: string) =>
  (await db.query(`SELECT "legacyUrl" FROM "Listing" WHERE id = $1`, [id])).rows[0].legacyUrl;

beforeAll(async () => {
  expect(NAME, "migration *_booking_channels exists").toBeDefined();
  await admin(`DROP DATABASE IF EXISTS ${TMP}`);
  await admin(`CREATE DATABASE ${TMP}`);
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${TMP}`;
  db = new Client({ connectionString: url.toString() });
  await db.connect();
  await db.query(sql("20261026171821_init"));
  await db.query(sql("20261028161244_drop_penginapan_type"));
  await db.query(`INSERT INTO "City" (id, name, slug, code, "updatedAt") VALUES ('c', 'Kota', 'kota', 'KT', now())`);
  await db.query(`INSERT INTO "Setting" (id, "waDefault") VALUES (1, '6289999999999')`);
  await listing("a", "https://www.agoda.com/x?cid=1", "6281111111111");
  await listing("b", "https://traveloka.com/h", null);
  await listing("c", "https://invol.co/abc", null);
  await listing("d", "http://Booking.com:443/hotel/id/x", null);
  await listing("e", "https://notagoda.com/y", null);
  for (const [id, kind] of [["a", "PESAN"], ["a", "WA"], ["c", "PESAN"], ["a", "VIEW"]]) await event(id, kind);
  await db.query(sql(NAME!));
});

afterAll(async () => {
  await db?.end();
  await admin(`DROP DATABASE IF EXISTS ${TMP}`);
});

describe("booking channels migration", () => {
  it("moves known OTA links to their channel and WA numbers to wa.me links", async () => {
    expect(await links("a")).toEqual([
      { channel: "AGODA", url: "https://www.agoda.com/x?cid=1" },
      { channel: "WHATSAPP", url: "https://wa.me/6281111111111" },
    ]);
    expect(await links("b")).toEqual([
      { channel: "TRAVELOKA", url: "https://traveloka.com/h" },
      { channel: "WHATSAPP", url: "https://wa.me/6289999999999" },
    ]);
    expect((await links("d"))[0]).toEqual({ channel: "BOOKING", url: "http://Booking.com:443/hotel/id/x" });
  });

  it("keeps unknown-domain links in legacyUrl instead of dropping them", async () => {
    expect(await legacy("c")).toBe("https://invol.co/abc");
    expect(await links("c")).toEqual([{ channel: "WHATSAPP", url: "https://wa.me/6289999999999" }]);
    expect(await legacy("e")).toBe("https://notagoda.com/y");
    expect(await legacy("a")).toBeNull();
  });

  it("turns old clicks into CLICK events with a channel", async () => {
    const rows = (
      await db.query(`SELECT "listingId", kind::text, channel::text FROM "Event" ORDER BY id`)
    ).rows;
    expect(rows).toEqual([
      { listingId: "a", kind: "CLICK", channel: "AGODA" },
      { listingId: "a", kind: "CLICK", channel: "WHATSAPP" },
      { listingId: "c", kind: "CLICK", channel: null },
      { listingId: "a", kind: "VIEW", channel: null },
    ]);
  });

  it("drops the old columns", async () => {
    const cols = (
      await db.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'Listing' AND column_name IN ('affiliateUrl', 'waNumber')`,
      )
    ).rows;
    expect(cols).toEqual([]);
  });
});

describe("booking channels migration without a default WA number", () => {
  it("gives a listing without its own number no WhatsApp link", async () => {
    // Same SQL on a second database where Setting has no row.
    const tmp2 = `${TMP}_nowa`;
    await admin(`DROP DATABASE IF EXISTS ${tmp2}`);
    await admin(`CREATE DATABASE ${tmp2}`);
    const url = new URL(process.env.DATABASE_URL!);
    url.pathname = `/${tmp2}`;
    const c = new Client({ connectionString: url.toString() });
    await c.connect();
    try {
      await c.query(sql("20261026171821_init"));
      await c.query(sql("20261028161244_drop_penginapan_type"));
      await c.query(`INSERT INTO "City" (id, name, slug, code, "updatedAt") VALUES ('c', 'Kota', 'kota', 'KT', now())`);
      await c.query(
        `INSERT INTO "Listing" (id, name, slug, "cityId", type, area, price, description, facilities, "extraFacilities",
           "affiliateUrl", published, "updatedAt")
         VALUES ('x', 'x', 'x', 'c', 'HOTEL', 'a', 100000, 'd', '{}', '{}', 'https://tiket.com/x', true, now())`,
      );
      await c.query(sql(NAME!));
      const rows = (await c.query(`SELECT channel::text FROM "ListingLink" WHERE "listingId" = 'x'`)).rows;
      expect(rows).toEqual([{ channel: "TIKET" }]);
    } finally {
      await c.end();
      await admin(`DROP DATABASE IF EXISTS ${tmp2}`);
    }
  });
});
