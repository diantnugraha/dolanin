import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const VIDEO_URL = "/bali/villa-sawah-asri"; // seed photos + the READY video inserted below (first)
const PHOTO_URL = "/yogyakarta/omah-tugu-inn"; // seed: 3 photos, no video

const withDb = async <T>(fn: (c: Client) => Promise<T>) => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
};

const removeTestVideo = (c: Client) => c.query(`DELETE FROM "Media" WHERE kind = 'VIDEO' AND key = 'test-guid'`);

let total = 0; // media count of the video listing, test video included

test.beforeAll(async () => {
  await withDb(async (c) => {
    await removeTestVideo(c);
    const { id } = (await c.query(`SELECT id FROM "Listing" WHERE slug = 'villa-sawah-asri'`)).rows[0];
    await c.query(
      `INSERT INTO "Media" (id, "listingId", kind, key, status, "durationSec", "sortOrder")
       VALUES ('e2e-test-video', $1, 'VIDEO', 'test-guid', 'READY', 12, -1)`,
      [id],
    );
    total = Number((await c.query(`SELECT count(*) FROM "Media" WHERE "listingId" = $1`, [id])).rows[0].count);
  });
});

test.afterAll(() => withDb(removeTestVideo));

// Bunny CDN is never reachable in tests: serve the clip and poster locally.
test.beforeEach(async ({ page }) => {
  await page.route("**/bunny.test/**", (route) => {
    const url = route.request().url();
    if (url.endsWith("/play_720p.mp4")) return route.fulfill({ path: "tests/e2e/fixtures/clip.mp4" });
    if (url.endsWith("/thumbnail.jpg")) return route.fulfill({ path: "public/dev-media/seed-villa-1-800.webp" });
    return route.abort();
  });
});

const hero = (page: Page) => page.locator('[data-slot="hero"]');
const viewer = (page: Page) => page.locator("dialog[open]");
// IntersectionObserver callbacks run with rendering frames: after two frames a wrong resume would have happened.
const frames = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const isPaused = (v: HTMLVideoElement) => v.paused;

test.describe("media mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("video-first hero: muted inline loop, pill, overlay controls", async ({ page }) => {
    await page.goto(VIDEO_URL);
    const video = hero(page).locator('video[poster*="test-guid/thumbnail.jpg"]');
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute("muted");
    await expect(video).toHaveAttribute("playsinline");
    await expect(video).toHaveAttribute("loop");
    await expect(video).toHaveAttribute("preload", "metadata");
    await expect(video).toHaveAttribute("src", /test-guid\/play_720p\.mp4$/);
    await expect(hero(page).getByText("Video · 0:12")).toBeVisible();
    await expect(hero(page).getByRole("link", { name: "Kembali" })).toHaveAttribute("href", "/bali");
    await expect(hero(page).getByRole("button", { name: "Layar penuh" })).toBeVisible();
    await expect(hero(page).getByRole("button", { name: "Bagikan" })).toBeVisible();
    await expect(hero(page).locator("[data-progress] > *")).toHaveCount(total);
    // the info panel peeks above the dock on first paint
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  });

  test("video autoplays muted and the sound button toggles muted", async ({ page }) => {
    await page.goto(VIDEO_URL);
    const video = hero(page).locator("video");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.muted)).toBe(true);
    await hero(page).getByRole("button", { name: "Nyalakan suara" }).click();
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
    await hero(page).getByRole("button", { name: "Matikan suara" }).click();
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  });

  test("hero video pauses once the sheet covers it or the viewer opens, then resumes", async ({ page }) => {
    await page.goto(VIDEO_URL);
    const playing = () => hero(page).locator("video").evaluate((v: HTMLVideoElement) => !v.paused);
    await expect.poll(playing).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect.poll(playing).toBe(false);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(playing).toBe(true);
    await hero(page).getByRole("button", { name: "Layar penuh" }).click();
    await expect.poll(playing).toBe(false);
    await expect.poll(() => viewer(page).locator("video").first().evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
    await page.keyboard.press("Escape");
    await expect.poll(playing).toBe(true);
  });

  test("Jeda video pauses the hero and it stays paused after scrolling away and back", async ({ page }) => {
    await page.goto(VIDEO_URL);
    const video = hero(page).locator("video");
    await expect.poll(() => video.evaluate(isPaused)).toBe(false);
    await hero(page).getByRole("button", { name: "Jeda video" }).click();
    expect(await video.evaluate(isPaused)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 1000));
    await frames(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await frames(page);
    expect(await video.evaluate(isPaused)).toBe(true);
    await hero(page).getByRole("button", { name: "Putar video" }).click();
    await expect.poll(() => video.evaluate(isPaused)).toBe(false);
  });

  test("hero share copies the link; its toast shows above the info sheet", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined }));
    await page.goto(VIDEO_URL);
    await hero(page).getByRole("button", { name: "Bagikan" }).click();
    const toast = page.getByRole("status").filter({ hasText: "Tautan disalin" });
    await expect(toast).toBeVisible();
    const onTop = await toast.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    });
    expect(onTop).toBe(true);
  });

  test("reduced motion: no autoplay, poster with play button", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(VIDEO_URL);
    const play = hero(page).getByRole("button", { name: "Putar video" });
    await expect(play).toBeVisible();
    expect(await hero(page).locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await play.click();
    await expect.poll(() => hero(page).locator("video").evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  });

  test("reduced motion: only the active viewer slide has a play button", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(VIDEO_URL);
    await hero(page).getByRole("button", { name: "Layar penuh" }).click();
    const play = viewer(page).getByRole("button", { name: "Putar video" });
    await expect(play).toHaveCount(1);
    await viewer(page).locator("[data-track]").evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: "instant" }));
    await expect(viewer(page)).toContainText(`2 dari ${total}`);
    await expect(play).toHaveCount(0);
  });

  test("Layar penuh opens the viewer at 1; Esc and ✕ close it; dock stays", async ({ page }) => {
    await page.goto(VIDEO_URL);
    await hero(page).getByRole("button", { name: "Layar penuh" }).click();
    await expect(viewer(page)).toContainText("Villa Sawah Asri");
    await expect(viewer(page)).toContainText(`1 dari ${total}`);
    await expect(viewer(page).locator('a[href$="/pesan"]')).toBeVisible();
    await expect(viewer(page).getByRole("link", { name: "Chat WhatsApp" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer(page)).toHaveCount(0);

    await hero(page).getByRole("button", { name: "Layar penuh" }).click();
    await expect(viewer(page)).toBeVisible();
    await viewer(page).getByRole("button", { name: "Tutup" }).click();
    await expect(viewer(page)).toHaveCount(0);
  });

  test("viewer swipes to the next item", async ({ page }) => {
    await page.goto(VIDEO_URL);
    await hero(page).getByRole("button", { name: "Layar penuh" }).click();
    await viewer(page).locator("[data-track]").evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: "instant" }));
    await expect(viewer(page)).toContainText(`2 dari ${total}`);
  });

  test("Foto & video thumbnails open the viewer at their index", async ({ page }) => {
    await page.goto(VIDEO_URL);
    const grid = page.locator("section", { has: page.getByRole("heading", { name: "Foto & video" }) });
    await grid.getByRole("button", { name: /^Lihat foto 2 dari/ }).click();
    await expect(viewer(page)).toContainText(`2 dari ${total}`);
  });

  test("only the hero video preloads metadata; other videos preload none", async ({ page }) => {
    await page.goto(VIDEO_URL);
    await hero(page).getByRole("button", { name: "Layar penuh" }).click();
    const preloads = await page.locator("video").evaluateAll((vs) =>
      vs.map((v) => [v.closest('[data-slot="hero"]') ? "hero" : "other", v.getAttribute("preload")]),
    );
    expect(preloads.filter(([w]) => w === "hero")).toEqual([["hero", "metadata"]]);
    const others = preloads.filter(([w]) => w === "other");
    expect(others.length).toBeGreaterThan(0);
    expect(others.every(([, p]) => p === "none")).toBe(true);
  });

  test("photo-only listing: 4:5 swipe gallery with dots, back and share", async ({ page }) => {
    await page.goto(PHOTO_URL);
    await expect(hero(page).locator("video")).toHaveCount(0);
    await expect(hero(page).locator("img").first()).toBeVisible();
    const dots = hero(page).locator("[data-dot]");
    await expect(dots).toHaveCount(3);
    await expect(dots.nth(0)).toHaveAttribute("data-active", "true");
    await hero(page).locator("[data-track]").evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: "instant" }));
    await expect(dots.nth(1)).toHaveAttribute("data-active", "true");
    await expect(hero(page).getByRole("link", { name: "Kembali" })).toHaveAttribute("href", "/yogyakarta");
    await expect(hero(page).getByRole("button", { name: "Bagikan" })).toBeVisible();
    await hero(page).getByRole("button", { name: "Lihat foto 2 dari 3" }).click();
    await expect(viewer(page)).toContainText("2 dari 3");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe("media desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("breadcrumb and title row above the mosaic; Lihat semua opens the viewer", async ({ page }) => {
    await page.goto(VIDEO_URL);
    const crumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumb.getByRole("link", { name: "Beranda" })).toHaveAttribute("href", "/");
    await expect(crumb.getByRole("link", { name: "Bali" })).toHaveAttribute("href", "/bali");
    await expect(crumb).toContainText("Villa Sawah Asri");

    const mosaic = page.locator("[data-mosaic]");
    await expect(mosaic).toBeVisible();
    await expect(hero(page)).toBeHidden();
    const h1 = await page.getByRole("heading", { level: 1 }).boundingBox();
    const m = await mosaic.boundingBox();
    expect(h1!.y + h1!.height).toBeLessThan(m!.y);
    await expect(page.getByRole("button", { name: "Bagikan" })).toBeVisible();

    const video = mosaic.locator("video");
    await expect(video).toHaveAttribute("muted");
    await expect(video).toHaveAttribute("preload", "none");
    await expect(video).not.toHaveAttribute("poster"); // a poster attribute is fetched even under display:none
    await expect(mosaic.locator('img[src*="test-guid/thumbnail.jpg"]')).toHaveAttribute("loading", "lazy");
    await expect(mosaic.getByText("Video · 0:12")).toBeVisible();

    await page.getByRole("button", { name: `Lihat semua (${total})` }).click();
    await expect(viewer(page)).toContainText(`1 dari ${total}`);
    await expect(viewer(page).locator('a[href$="/pesan"]')).toBeVisible(); // dock shown at desktop width too
    await page.keyboard.press("ArrowLeft"); // already first: nothing moves
    await frames(page);
    await expect(viewer(page)).toContainText(`1 dari ${total}`);
    await viewer(page).getByRole("button", { name: "Berikutnya" }).click();
    await expect(viewer(page)).toContainText(`2 dari ${total}`);
    await page.keyboard.press("ArrowLeft");
    await expect(viewer(page)).toContainText(`1 dari ${total}`);
    await page.keyboard.press("Escape");
    await expect(viewer(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Pesan sekarang" })).toBeVisible();
  });

  test("booking card stays pinned while the page scrolls", async ({ page }) => {
    await page.goto(VIDEO_URL);
    const card = page.getByLabel("Pemesanan");
    await page.evaluate(() => window.scrollTo(0, 300));
    const a = (await card.boundingBox())!.y;
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect.poll(async () => (await card.boundingBox())!.y).toBe(a);
  });

  test("Jeda video pauses the mosaic video and it stays paused after scrolling away and back", async ({ page }) => {
    await page.goto(VIDEO_URL);
    const mosaic = page.locator("[data-mosaic]");
    const video = mosaic.locator("video");
    await expect.poll(() => video.evaluate(isPaused)).toBe(false);
    await mosaic.getByRole("button", { name: "Jeda video" }).click();
    expect(await video.evaluate(isPaused)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 600));
    await frames(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await frames(page);
    expect(await video.evaluate(isPaused)).toBe(true);
    await mosaic.getByRole("button", { name: "Putar video" }).click();
    await expect.poll(() => video.evaluate(isPaused)).toBe(false);
  });

  test("photo-only mosaic", async ({ page }) => {
    await page.goto(PHOTO_URL);
    const mosaic = page.locator("[data-mosaic]");
    await expect(mosaic.locator("video")).toHaveCount(0);
    await expect(mosaic.locator("img")).toHaveCount(3);
    await page.getByRole("button", { name: "Lihat semua (3)" }).click();
    await expect(viewer(page)).toContainText("1 dari 3");
  });
});

// The mosaic is desktop-only. On phones it must cost no data (hemat kuota).
// Signal: a 5th media item with a unique key is shown only by the mosaic (the grid stops at 4 and the
// video hero shows the first item only), so any request containing that key on a phone came from the
// mosaic. Element state (img.currentSrc) is no signal: a lazy <img> adopts an already-cached URL
// without a request, and mosaic photos share URLs with the grid.
test.describe("mosaic on phones", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const kind of ["VIDEO", "PHOTO"] as const) {
    test(`the hidden mosaic fetches nothing (mosaic-only ${kind.toLowerCase()})`, async ({ page }) => {
      const key = `mosaic-only-${kind.toLowerCase()}`;
      await withDb((c) =>
        c.query(
          `INSERT INTO "Media" (id, "listingId", kind, key, status, "durationSec", "sortOrder")
           SELECT $1, id, $2::"MediaKind", $3, $4::"VideoStatus", $5::int, 99 FROM "Listing" WHERE slug = 'villa-sawah-asri'`,
          [`e2e-${key}`, kind, key, kind === "VIDEO" ? "READY" : null, kind === "VIDEO" ? 30 : null],
        ),
      );
      try {
        const hits: string[] = [];
        page.on("request", (r) => r.url().includes(key) && hits.push(r.url()));
        await page.goto(VIDEO_URL, { waitUntil: "networkidle" });
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForLoadState("networkidle");
        // the item really is in the mosaic markup
        const inMosaic = kind === "VIDEO" ? `video[src*="${key}"]` : `img[src*="${key}"]`;
        await expect(page.locator(`[data-mosaic] ${inMosaic}`)).toHaveCount(1);
        expect(hits).toEqual([]);
      } finally {
        await withDb((c) => c.query(`DELETE FROM "Media" WHERE key = $1`, [key]));
      }
    });
  }
});
