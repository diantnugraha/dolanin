import { expect, test } from "@playwright/test";
import { Client } from "pg";

const URL = "/yogyakarta/omah-tugu-inn";

const withDb = async <T>(fn: (c: Client) => Promise<T>) => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
};

const idOf = (slug: string) =>
  withDb(async (c) => (await c.query(`SELECT id FROM "Listing" WHERE slug = $1`, [slug])).rows[0].id as string);

test.describe("detail mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("content and the dock price", async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Omah Tugu Inn");
    await expect(page.getByRole("heading", { name: "Kenapa kami pilih ini" })).toBeVisible();
    await expect(page.getByText("Dipilih tim Dolanin")).toBeVisible();
    await expect(page.locator("main").getByText("Rp185.000").first()).toBeVisible();
    await expect(page.locator("[data-dock]").getByText("Pesan di")).toBeVisible();
  });

  test("three links share the dock width, in channel order", async ({ page }) => {
    const id = await idOf("villa-sawah-asri");
    await page.goto("/bali/villa-sawah-asri");
    const tiles = page.locator("[data-dock] a");
    await expect(tiles).toHaveCount(3);
    for (const [i, [name, slug]] of [["Pesan di Agoda", "agoda"], ["Pesan di Traveloka", "traveloka"], ["Chat via WhatsApp", "whatsapp"]].entries()) {
      await expect(tiles.nth(i)).toHaveAccessibleName(name);
      await expect(tiles.nth(i)).toHaveAttribute("href", `/go/${id}/${slug}`);
      await expect(tiles.nth(i)).toHaveAttribute("target", "_blank");
      await expect(tiles.nth(i)).toHaveAttribute("rel", /noopener/);
      await expect(tiles.nth(i)).toBeInViewport({ ratio: 1 });
    }
  });

  test("the dock stays compact: at most 92px tall, tiles 44px", async ({ page }) => {
    for (const url of ["/bali/villa-sawah-asri", URL, "/bandung/kamar-dago-atas"]) {
      await page.goto(url);
      const dock = (await page.locator("[data-dock]").boundingBox())!;
      expect(dock.height, url).toBeLessThanOrEqual(92);
      expect((await page.locator("[data-dock] a").first().boundingBox())!.height, url).toBe(44);
    }
  });

  test("logos keep their aspect ratio on a narrow 360px phone", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    for (const url of ["/bali/villa-sawah-asri", URL]) {
      await page.goto(url);
      const imgs = page.locator("[data-dock] a img");
      await expect(imgs.first()).toBeVisible();
      const ratios = await imgs.evaluateAll((els) =>
        (els as HTMLImageElement[]).map((im) => ({
          src: im.getAttribute("src"),
          drift: Math.abs(im.clientWidth / im.clientHeight / (im.naturalWidth / im.naturalHeight) - 1),
          inside: (() => {
            const i = im.getBoundingClientRect(), t = im.parentElement!.getBoundingClientRect();
            return i.left >= t.left && i.right <= t.right && i.top >= t.top && i.bottom <= t.bottom;
          })(),
        })),
      );
      for (const r of ratios) {
        expect(r.drift, r.src ?? "").toBeLessThan(0.02);
        expect(r.inside, `${r.src} inside its tile`).toBe(true);
      }
    }
  });

  test("six links scroll sideways inside the dock, never the page", async ({ page }) => {
    await page.goto(URL);
    const tiles = page.locator("[data-dock] a");
    await expect(tiles).toHaveCount(6);
    const row = page.locator("[data-dock] [role=group]");
    expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(tiles.last()).not.toBeInViewport({ ratio: 1 });
    await tiles.last().focus();
    await expect(tiles.last()).toBeFocused();
    await expect(tiles.last()).toBeInViewport({ ratio: 1 });
  });

  test("dock is in viewport after scrolling to the bottom", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator("[data-dock]")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe("detail desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("booking card lists the links, no dock", async ({ page }) => {
    const id = await idOf("kamar-dago-atas");
    await page.goto("/bandung/kamar-dago-atas");
    const card = page.getByLabel("Pemesanan");
    await expect(card.getByRole("heading", { name: "Pesan di" })).toBeVisible();
    await expect(card.getByRole("link")).toHaveCount(1);
    await expect(card.getByRole("link", { name: "Pesan di Booking.com" })).toHaveAttribute("href", `/go/${id}/booking`);
    await expect(card.getByText("Pemesanan diproses di situs partner resmi. Harga bisa berubah sewaktu-waktu.")).toBeVisible();
    await expect(page.locator("[data-dock]")).toBeHidden();

    const res = await page.request.get(`/go/${id}/booking`, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("https://example.com/kamar-dago-atas/booking");
  });

  test("the default WA number never adds a WhatsApp tile", async ({ page }) => {
    await page.goto("/bandung/kamar-dago-atas");
    await expect(page.getByRole("link", { name: "Chat via WhatsApp" })).toHaveCount(0);
    await expect(page.locator('a[href*="/go/"][href$="/whatsapp"]')).toHaveCount(0);
  });
});

test("og:image is absolute", async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^http/);
});

test("draft listing is 404", async ({ page }) => {
  const res = await page.goto("/yogyakarta/pondok-kaliurang");
  expect(res?.status()).toBe(404);
});
