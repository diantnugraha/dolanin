# Link Pemesanan per Channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single affiliate link + WhatsApp number of a listing with up to six booking links (Agoda, Traveloka, Trip.com, tiket.com, Booking.com, WhatsApp), shown as logo tiles on the detail page, tracked and reported per channel.

**Architecture:** New `ListingLink` table keyed by a `BookingChannel` enum (enum order = display order). One hand-written migration converts old data (domain → channel, unknown domain → `Listing.legacyUrl`, WA number → `wa.me` link, old PESAN/WA events → `CLICK` + channel). `/go/{id}/{channel}` redirects and records a `CLICK` with its channel; the dashboard groups clicks by channel.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg`), PostgreSQL 17, CSS Modules, Vitest (unit + int), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-booking-channels-design.md` (approved mockup: `docs/superpowers/specs/2026-10-29-booking-channels/mockup.html`, assets in the same folder).

## Global Constraints

- Channel order everywhere: AGODA, TRAVELOKA, TRIP, TIKET, BOOKING, WHATSAPP. URL slugs: `agoda`, `traveloka`, `trip`, `tiket`, `booking`, `whatsapp`. Labels: `Agoda`, `Traveloka`, `Trip.com`, `tiket.com`, `Booking.com`, `WhatsApp`.
- Link values: any `http(s)` URL (reuse `httpUrl` in `lib/validation.ts`); no per-domain check.
- A published listing needs ≥1 link (WhatsApp counts). Drafts may have none. Error copy: `Isi minimal satu link pemesanan`.
- Accessible names: `Pesan di {label}` for OTAs, `Chat via WhatsApp` for WhatsApp; logo `<img alt="">`.
- Tiles: rounded rectangles, radius 12px, white, 1px `var(--garis)` border, logo only. Phone: 1–3 tiles share the width; >3 tiles are 132px wide in a horizontally scrollable row (`scroll-snap`), no fade/gradient. Desktop card: stacked 56px-tall tiles with logo left and an arrow right.
- Logo display heights (phone, 2–3 tiles and >3): Agoda 30px, Booking.com 17px, others 21px; single tile: Agoda 34px, others 24px; `max-width: 100%`.
- Brand rules: no gradients; Poppins; tokens from `app/globals.css`.
- Settings `waDefault` stays for the header "Tanya via WA" and the landing WA block only.
- Commit after each task; run `graphify update .` after code changes (CLAUDE.md).

## Review Focus

1. Old affiliate links on unknown domains (short links like `invol.co`): must survive in `legacyUrl`, be shown in the form, flagged in the listing table, and cleared on the next save — never silently lost.
2. A listing with >3 links on a 390px phone: row scrolls horizontally, every tile reachable by touch and keyboard (Tab), page itself never scrolls sideways.
3. `/go/{id}/{channel}` for a channel the listing does not have, an unknown slug, a draft, or a HEAD request: 404 / no event, never a redirect to an empty URL.
4. Dashboard with only legacy "Lainnya" clicks: "Channel teratas" shows `–` (not "Lainnya"), bars still sum to 100%.
5. Editing a listing removes a link: the tile disappears from the detail page and its `/go` URL returns 404.

---

### Task 1: Data model, migration, channel constants, seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<UTC timestamp>_booking_channels/migration.sql`
- Create: `lib/channels.ts`
- Modify: `prisma/seed.ts`
- Copy: `docs/superpowers/specs/2026-10-29-booking-channels/logos/*.png` → `public/channels/{slug}.png`; `.../icons/*.png` → `public/channels/icon-{slug}.png`
- Test: `tests/int/migration-channels.test.ts`, `tests/unit/channels.test.ts`, update `tests/int/seed.test.ts` if it asserts `affiliateUrl`

**Interfaces:**
- Produces (schema): `enum BookingChannel { AGODA TRAVELOKA TRIP TIKET BOOKING WHATSAPP }`; `enum EventKind { VIEW CLICK }`; `model ListingLink { id String @id @default(cuid()); listingId String; listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade); channel BookingChannel; url String; @@unique([listingId, channel]) }`; `Listing.links ListingLink[]`, `Listing.legacyUrl String?`; `Listing.affiliateUrl` and `Listing.waNumber` removed; `Event.channel BookingChannel?`.
- Produces (`lib/channels.ts`, isomorphic, type-only Prisma import):
  - `CHANNELS: readonly { id: BookingChannel; slug: ChannelSlug; label: string }[]` in the order above
  - `type ChannelSlug = "agoda" | "traveloka" | "trip" | "tiket" | "booking" | "whatsapp"`
  - `channelBySlug(slug: string): (typeof CHANNELS)[number] | undefined`
  - `channelById(id: BookingChannel): (typeof CHANNELS)[number]`
  - `linkName(id: BookingChannel): string` → `"Pesan di Agoda"` … / `"Chat via WhatsApp"`

- [ ] **Step 1: Write the failing unit test** `tests/unit/channels.test.ts`

```ts
expect(CHANNELS.map((c) => c.slug)).toEqual(["agoda", "traveloka", "trip", "tiket", "booking", "whatsapp"]);
expect(CHANNELS.map((c) => c.label)).toEqual(["Agoda", "Traveloka", "Trip.com", "tiket.com", "Booking.com", "WhatsApp"]);
expect(channelBySlug("tiket")?.id).toBe("TIKET");
expect(channelBySlug("pesan")).toBeUndefined();
expect(linkName("TRIP")).toBe("Pesan di Trip.com");
expect(linkName("WHATSAPP")).toBe("Chat via WhatsApp");
```

- [ ] **Step 2: Write the failing migration test** `tests/int/migration-channels.test.ts`

Runs the real SQL files against a throwaway database `dolanin_migration_test` (create with `pg` from `DATABASE_URL`'s server; `DROP DATABASE IF EXISTS` before and after). Apply, in order, `20261026171821_init` and `20261028161244_drop_penginapan_type`, insert old-shape rows, then apply the new migration file. Assert:

```ts
// listings: a = "https://www.agoda.com/x?cid=1" + waNumber "6281111111111"; b = "https://traveloka.com/h";
// c = "https://invol.co/abc" (unknown) + no waNumber; d = "https://example.com/z" with no waNumber; Setting.waDefault = "6289999999999"
expect(links("a")).toEqual([{ channel: "AGODA", url: "https://www.agoda.com/x?cid=1" }, { channel: "WHATSAPP", url: "https://wa.me/6281111111111" }]);
expect(links("b")).toEqual([{ channel: "TRAVELOKA", url: "https://traveloka.com/h" }, { channel: "WHATSAPP", url: "https://wa.me/6289999999999" }]);
expect(legacy("c")).toBe("https://invol.co/abc");
expect(links("c")).toEqual([{ channel: "WHATSAPP", url: "https://wa.me/6289999999999" }]);
expect(legacy("a")).toBeNull();
// events: a PESAN -> CLICK/AGODA, a WA -> CLICK/WHATSAPP, c PESAN -> CLICK/null, VIEW stays VIEW/null
// columns gone: information_schema has no Listing.affiliateUrl / Listing.waNumber
```

Also one case with no `waDefault` row: a listing without `waNumber` gets no WHATSAPP link.

- [ ] **Step 3: Run both tests, verify they fail**

Run: `npx vitest run tests/unit/channels.test.ts tests/int/migration-channels.test.ts`
Expected: FAIL (module / migration file not found).

- [ ] **Step 4: Schema + migration**

Edit `prisma/schema.prisma` per Interfaces. Write the migration by hand (Prisma cannot generate the data moves). One `BEGIN; … COMMIT;` script, in this order:
1. `CREATE TYPE "BookingChannel" AS ENUM (...)`; `CREATE TABLE "ListingLink"` (`id TEXT`, `listingId TEXT`, `channel "BookingChannel"`, `url TEXT`, all NOT NULL, pkey), unique index `ListingLink_listingId_channel_key`, FK `ListingLink_listingId_fkey … ON DELETE CASCADE ON UPDATE CASCADE` (same style as `Media_listingId_fkey`); `ALTER TABLE "Listing" ADD COLUMN "legacyUrl" TEXT`.
2. `CREATE FUNCTION pg_temp.channel_of(u text) RETURNS "BookingChannel"`: host = `lower(substring(u from '^https?://([^/?#:]+)'))`; returns AGODA/TRAVELOKA/TRIP/TIKET/BOOKING when host equals `x.com` or ends with `.x.com` for `agoda`, `traveloka`, `trip`, `tiket`, `booking`; else NULL.
3. `INSERT INTO "ListingLink" SELECT gen_random_uuid()::text, id, pg_temp.channel_of("affiliateUrl"), "affiliateUrl" FROM "Listing" WHERE pg_temp.channel_of("affiliateUrl") IS NOT NULL`; `UPDATE "Listing" SET "legacyUrl" = "affiliateUrl" WHERE pg_temp.channel_of("affiliateUrl") IS NULL AND "affiliateUrl" ~* '^https?://'`.
4. WhatsApp: insert `'https://wa.me/' || COALESCE(l."waNumber", s."waDefault")` for every listing where that is not null (`LEFT JOIN "Setting" s ON s.id = 1`).
5. Events: `ADD COLUMN "channel" "BookingChannel"`; WA → `'WHATSAPP'`; PESAN → `pg_temp.channel_of(l."affiliateUrl")` via `UPDATE … FROM "Listing" l`; then swap `EventKind` to `('VIEW','CLICK')` with `USING (CASE WHEN kind::text = 'VIEW' THEN 'VIEW' ELSE 'CLICK' END)::"EventKind_new"`, rename, drop old type.
6. `ALTER TABLE "Listing" DROP COLUMN "affiliateUrl", DROP COLUMN "waNumber"`.

Apply to the dev DB: `npx prisma migrate deploy`, then confirm no drift: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` prints `-- This is an empty migration.`

- [ ] **Step 5: `lib/channels.ts`, assets, seed**

Implement Interfaces. Copy the 12 PNGs to `public/channels/`. Seed: replace `affiliateUrl`/`waNumber` with `links` written via `db.listingLink.createMany` after each listing upsert (delete existing first). Keep it varied so E2E has fixtures: Omah Tugu Inn → all six (`https://example.com/{slug}/{channel}` for OTAs, `https://wa.me/6281200000000` for WhatsApp); Villa Sawah Asri → AGODA, TRAVELOKA, WHATSAPP; Kamar Dago Atas → BOOKING only; every other published listing → TRAVELOKA + WHATSAPP; draft Pondok Kaliurang → none.

- [ ] **Step 6: Run tests, verify pass**

Run: `npx vitest run tests/unit/channels.test.ts tests/int/migration-channels.test.ts tests/int/seed.test.ts`. Expected: PASS. The app-wide `tsc` stays red until Task 3 (Tasks 1–3 change one schema the app reads everywhere); that is expected, not a regression.

- [ ] **Step 7: Commit** `feat(db): booking channels schema, data migration, channel constants`

---

### Task 2: Validation, save, CMS form and listing table

**Files:**
- Modify: `lib/validation.ts`, `lib/admin.ts`, `components/admin/ListingForm.tsx`, `components/admin/ListingTable.tsx`, `components/admin/actions.ts` (types only if needed), `components/admin/SettingsForm.tsx` (hint copy)
- Test: `tests/unit/validation.test.ts`, `tests/int/admin-listing.test.ts`, `tests/int/admin-city.test.ts` / `tests/int/catalog.test.ts` (fixtures drop `affiliateUrl`)

**Interfaces:**
- Consumes: `CHANNELS`, `BookingChannel` (Task 1).
- Produces:
  - `listingInput` field `links: Partial<Record<BookingChannel, string>>` (each optional `httpUrl`, empty string → absent). Rule: `published && no links` → issue path `["links"]`, message `Isi minimal satu link pemesanan`.
  - `saveListing` error keys: `links.AGODA` … for a bad URL, `links` for the minimum rule (path joined with `.` for `links`, first segment otherwise). Saving replaces all `ListingLink` rows in the transaction and sets `legacyUrl: null`.
  - `AdminListingDetail.links: Partial<Record<BookingChannel, string>>`, `AdminListingDetail.legacyUrl: string | null`; `AdminListingRow.legacyUrl: boolean` (true when a legacy link is waiting).

- [ ] **Step 1: Failing tests**

`tests/unit/validation.test.ts`: `base` uses `links: { AGODA: "https://x.com/a" }` instead of `affiliateUrl`/`waNumber`; the `err` helper keys issues the same way `saveListing` will (`i.path[0] === "links" && i.path[1] ? \`links.${String(i.path[1])}\` : String(i.path[0])`). Drop the two `waNumber` cases.
```ts
expect(err({ links: { TRIP: "javascript:alert(1)" } })?.["links.TRIP"]).toBe("Link harus diawali http:// atau https://");
expect(listingInput.parse({ ...base, links: { AGODA: "", WHATSAPP: "https://wa.me/62812" } }).links).toEqual({ WHATSAPP: "https://wa.me/62812" });
expect(err({ published: true, links: {} })?.links).toBe("Isi minimal satu link pemesanan");
expect(listingInput.safeParse({ ...base, published: false, links: {} }).success).toBe(true);
```
`tests/int/admin-listing.test.ts`:
```ts
// save with links {AGODA, WHATSAPP} -> 2 ListingLink rows; re-save with {BOOKING} -> exactly 1 row BOOKING
// a listing whose legacyUrl is set -> getAdminListing returns it; after saveListing it is null
// listAdminListings marks legacyUrl true only for that listing
// saveListing({...published:true, links:{}}) -> { ok:false, errors:{ links: "Isi minimal satu link pemesanan" } }
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run tests/unit/validation.test.ts tests/int/admin-listing.test.ts`

- [ ] **Step 3: Implement** validation, `saveListing` (`tx.listingLink.deleteMany` + `createMany`), `getAdminListing`, `listAdminListings`.

Form: replace the "Tombol Pesan & WhatsApp" section with **Link pemesanan**:
- hint `Isi minimal satu. Yang dikosongkan tidak tampil di halaman detail.`
- one row per channel: `<label>` with `<img src="/channels/icon-{slug}.png" alt="" width=20 height=20>` + label, `<input inputMode="url" placeholder="https://">`; WhatsApp placeholder `https://wa.me/628…`, field hint `Contoh: https://wa.me/6281234567890?text=Halo`
- per-field errors from `links.{ID}`, section error from `links`
- when `initial.legacyUrl`: a notice above the rows, `Link lama belum masuk channel mana pun:` + the URL as text + `Salin ke kolom yang sesuai, lalu simpan.`

Listing table: rows with `legacyUrl` get a small `Cek link lama` badge next to the status (same badge style as existing status pills).

Settings hint: `Nomor ini dipakai tombol "Tanya via WA" di header dan blok WhatsApp di landing. Kosongkan untuk menyembunyikannya.`

- [ ] **Step 4: Run, verify pass** — same vitest command, plus `npx tsc --noEmit` for the files touched so far.

- [ ] **Step 5: Commit** `feat(cms): booking links per channel in the listing form`

---

### Task 3: `/go` route, tracking, detail page tiles

**Files:**
- Modify: `lib/tracking.ts`, `app/go/[id]/[kind]/route.ts` (no logic change expected), `app/api/view/route.ts` (call shape), `lib/catalog.ts`, `lib/wa.ts` (remove `listingWaText`), `app/(site)/[kota]/[slug]/page.tsx`, `components/site/ActionDock.tsx` + `.module.css`, `components/site/BookingCard.tsx` + `.module.css`
- Create: `components/site/ChannelTiles.tsx`, `components/site/ChannelTiles.module.css`
- Test: `tests/int/go-route.test.ts`, `tests/unit/wa.test.ts`, `tests/int/catalog.test.ts`, `tests/e2e/detail.spec.ts`, `tests/e2e/detail-media.spec.ts`

**Interfaces:**
- Consumes: `CHANNELS`, `channelBySlug`, `linkName` (Task 1).
- Produces:
  - `recordEvent(listingId: string, kind: EventKind, channel?: BookingChannel): Promise<boolean>`
  - `resolveGo(id, kind, ua, { record })`: `kind` is a channel slug, or legacy `pesan` (first non-WHATSAPP link, else WHATSAPP) / `wa` (WHATSAPP). Records `CLICK` with the resolved channel. 404 for unknown slug, missing link, draft, non-http stored URL.
  - `ListingDetail.channels: BookingChannel[]` (ordered by enum, from `links: { select: { channel: true }, orderBy: { channel: "asc" } }`); `waNumber` removed.
  - `ChannelTiles({ id, channels, variant }: { id: string; channels: BookingChannel[]; variant: "dock" | "card" })`: renders `<a href="/go/{id}/{slug}" target="_blank" rel="noopener nofollow" aria-label={linkName(c)}>` with `<img src="/channels/{slug}.png" alt="" height=… />`.
  - `ActionDock({ id, price, channels })`, `BookingCard({ id, price, normalPrice, channels })`.

- [ ] **Step 1: Failing tests**

`tests/int/go-route.test.ts` (Omah Tugu Inn has all six):
```ts
expect(await resolveGo(l.id, "traveloka", CHROME)).toEqual({ status: 302, location: url(l, "TRAVELOKA") });
expect(await db.event.findFirst()).toMatchObject({ kind: "CLICK", channel: "TRAVELOKA", cityId: l.cityId, type: l.type });
expect(await resolveGo(dago.id, "agoda", CHROME)).toEqual({ status: 404 });     // Kamar Dago Atas has BOOKING only
expect(await resolveGo(l.id, "expedia", CHROME)).toEqual({ status: 404 });
expect(await resolveGo(l.id, "pesan", CHROME)).toEqual({ status: 302, location: url(l, "AGODA") });   // first non-WA
expect(await resolveGo(waOnly.id, "pesan", CHROME)).toMatchObject({ status: 302 });                  // falls back to WHATSAPP, event channel WHATSAPP
expect(await resolveGo(l.id, "wa", CHROME)).toEqual({ status: 302, location: url(l, "WHATSAPP") });
// HEAD (record:false) and bot UA: redirect, no event; draft listing: 404
```
`tests/int/catalog.test.ts`: `getListingDetail` for Villa Sawah Asri → `channels` equals `["AGODA","TRAVELOKA","WHATSAPP"]`.
`tests/unit/wa.test.ts`: drop the `listingWaText` case.
`tests/e2e/detail.spec.ts` (390×844 and 1280×800):
```ts
// Villa Sawah Asri, phone: dock has 3 links named "Pesan di Agoda", "Pesan di Traveloka", "Chat via WhatsApp", hrefs /go/{id}/agoda …, all fully inside the viewport
// Omah Tugu Inn, phone: 6 links in the dock; the row's scrollWidth > clientWidth; document.documentElement.scrollWidth === 390; Tab reaches the 6th link and it scrolls into view
// Kamar Dago Atas, desktop: booking card has exactly 1 link "Pesan di Booking.com"
// GET /go/{id}/booking (maxRedirects 0) -> 302 with the stored URL
```
`tests/e2e/detail-media.spec.ts`: the viewer dock assertion `Chat WhatsApp` → `Chat via WhatsApp`; desktop `Pesan sekarang` → `Pesan di Agoda` (or whichever first channel the fixture listing has).

- [ ] **Step 2: Run, verify fail** — `npx vitest run tests/int/go-route.test.ts tests/int/catalog.test.ts tests/unit/wa.test.ts`

- [ ] **Step 3: Implement** tracking, catalog, page, `ChannelTiles`, `ActionDock` (top line `Pesan di` left + price right as in the mockup; no tiles row when `channels` is empty), `BookingCard` (price + promo stamp, heading `Pesan di`, stacked tiles, existing partner note). CSS per Global Constraints; `ChannelTiles.module.css` owns `.tiles`, `.scroll` (only when `channels.length > 3` and variant `dock`), `.t`, logo-height classes per slug and the single-tile size. Load the `impeccable` skill before the UI edit (CLAUDE: design work) and keep to the approved mockup.

- [ ] **Step 4: Run, verify pass** — vitest command above, then `npx playwright test tests/e2e/detail.spec.ts tests/e2e/detail-media.spec.ts`.

- [ ] **Step 5: Commit** `feat(detail): booking channel tiles and per-channel /go tracking`

---

### Task 4: Dashboard per channel

**Files:**
- Modify: `lib/stats.ts`, `app/admin/(panel)/page.tsx`, `components/admin/LineChart.tsx`, `components/admin/CityBars.tsx`, `components/admin/TopListings.tsx`, `components/admin/ZeroClicks.tsx` (only if it reads kinds)
- Create: `components/admin/ChannelBars.tsx`
- Test: `tests/unit/stats-math.test.ts`, `tests/int/stats.test.ts`, `tests/e2e/admin-dashboard.spec.ts`

**Interfaces:**
- Consumes: `CHANNELS`, `channelById` (Task 1); `Event.kind CLICK`, `Event.channel`.
- Produces (`lib/stats.ts`):
  - `clickRatio(clicks: number, views: number): number | null`
  - `getKpis(f) → { clicks: Kpi; views: Kpi; ratio: number | null; top: { channel: BookingChannel; share: number } | null }` (`top` ignores `channel = null`; `share` = its clicks ÷ all clicks incl. null; null when no channel clicks)
  - `getDailySeries(f) → { date: string; clicks: number }[]`
  - `getClicksByChannel(f) → { channel: BookingChannel | null; count: number; share: number }[]` — count > 0 only, sorted desc, `null` ("Lainnya") always last, shares of all clicks
  - `getClicksByCity(f)` (renamed from `getPesanByCity`, counts `CLICK`)
  - `getTopListings(f) → { id; name; cityName; cover; views; clicks; topChannel: BookingChannel | null; ratio }[]` sorted by clicks desc, then views
  - `getZeroClickListings(f)` unchanged shape, "no `CLICK` events"

- [ ] **Step 1: Failing tests**

`tests/int/stats.test.ts`: event helper becomes `ev(l, "VIEW" | "CLICK", at, n, channel?)`. Cases:
```ts
// 6 CLICK AGODA + 3 CLICK WHATSAPP + 1 CLICK null + 20 VIEW in window; 3 CLICK AGODA in previous window
expect(k.clicks).toEqual({ value: 10, delta: 10 / 3 - 1 });
expect(k.top).toEqual({ channel: "AGODA", share: 0.6 });
expect(k.ratio).toBe(10 / 20);
expect(await getClicksByChannel(F)).toEqual([
  { channel: "AGODA", count: 6, share: 0.6 }, { channel: "WHATSAPP", count: 3, share: 0.3 }, { channel: null, count: 1, share: 0.1 },
]);
// only null clicks -> top === null, bars = [{ channel: null, count: n, share: 1 }]
// daily series buckets by WIB day as before, field `clicks`
// top listings: topChannel ignores null; zero-click listing list unchanged semantics
```
`tests/unit/stats-math.test.ts`: `clickRatio(3, 0) === null`, `clickRatio(3, 6) === 0.5`.
`tests/e2e/admin-dashboard.spec.ts`: seed `CLICK` rows with channels instead of PESAN/WA; assert KPI `clicks` = total, `Channel teratas` tile shows the label and %, the "Klik per channel" card lists channels in count order with "Lainnya" last.

- [ ] **Step 2: Run, verify fail** — `npx vitest run tests/unit/stats-math.test.ts tests/int/stats.test.ts`

- [ ] **Step 3: Implement** stats, then the page. Load the `dataviz` skill before touching charts.
  - KPI row: `Total klik` (hero, delta vs previous period), `Kunjungan halaman detail`, `Rasio klik` (note `klik ÷ kunjungan detail`), `Channel teratas` (label + `formatPercent(share)`, `–` when null).
  - Line chart: single series `clicks`, Jingga, table view kept, legend removed (single series, the title names it).
  - "Klik per channel": `ChannelBars`, one row per entry: 20px icon (`/channels/icon-{slug}.png`; "Lainnya" gets no icon), label, bar in one neutral hue (same as `CityBars`), count and %.
  - "Klik per kota" and "Listing paling banyak diklik" (columns Kunjungan, Klik, Channel teratas with its icon, Rasio).
  - Header copy: `Seberapa sering pengunjung menekan tombol pemesanan, per channel.`

- [ ] **Step 4: Run, verify pass** — vitest command above + `npx playwright test tests/e2e/admin-dashboard.spec.ts`.

- [ ] **Step 5: Commit** `feat(dashboard): clicks per booking channel`

---

### Task 5: Remaining tests, docs, full verification

**Files:**
- Modify: `tests/e2e/admin-listing.spec.ts`, any remaining test still naming `affiliateUrl`, `waNumber`, `PESAN`, `Pesan sekarang`, `Chat WhatsApp`
- Modify: `PRODUCT.md` (capabilities: six booking links per listing, per-channel dashboard), `DESIGN.md` (replace the ActionDock / BookingCard Pesan+WA description with the tile spec), `docs/deploy.md` (smoke test: a click on a channel tile shows up per channel in the dashboard)

- [ ] **Step 1:** `admin-listing.spec.ts`: the create flow fills `Agoda` (label text) with `https://example.com/aff`; add a test: publish with every link empty → `Isi minimal satu link pemesanan` visible and the URL stays on the form; add a test: a listing with `legacyUrl` set in the DB shows the notice and the `Cek link lama` badge, and both disappear after Simpan.
- [ ] **Step 2:** `grep -rn "affiliateUrl\|waNumber\|PESAN\|\"WA\"\|Pesan sekarang\|Chat WhatsApp\|listingWaText" app components lib tests prisma/seed.ts` returns nothing (migration SQL files excepted).
- [ ] **Step 3:** Full suite: `npx tsc --noEmit && npm run lint && npm run test:unit && npm run test:int && npx playwright test`. Expected: all pass.
- [ ] **Step 4:** Visual check at 390px and 1280px on the dev server for Villa Sawah Asri (3 tiles), Omah Tugu Inn (6, scroll), Kamar Dago Atas (1), CMS form, dashboard; compare with `docs/superpowers/specs/2026-10-29-booking-channels/mockup.html`.
- [ ] **Step 5:** Docs edits; `graphify update .`; commit `docs: booking channels`.
