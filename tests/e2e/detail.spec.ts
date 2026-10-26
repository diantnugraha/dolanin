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

test.describe("detail mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("content, Pesan link, WA link", async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Omah Tugu Inn");
    await expect(page.getByRole("heading", { name: "Kenapa kami pilih ini" })).toBeVisible();
    await expect(page.getByText("Dipilih tim Dolanin")).toBeVisible();
    await expect(page.locator("main").getByText("Rp185.000").first()).toBeVisible();
    const id = await withDb(async (c) => (await c.query(`SELECT id FROM "Listing" WHERE slug = 'omah-tugu-inn'`)).rows[0].id);
    const pesan = page.locator(`a[href="/go/${id}/pesan"]:visible`);
    await expect(pesan).toHaveAttribute("target", "_blank");
    await expect(pesan).toHaveAttribute("rel", /noopener/);
    await expect(page.locator(`a[href="/go/${id}/wa"]:visible`)).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Chat WhatsApp" })).toBeVisible();
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

  test("booking card, no dock", async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole("link", { name: "Pesan sekarang" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tanya via WhatsApp" })).toBeVisible();
    await expect(page.getByLabel("Pemesanan").getByText("Pemesanan diproses di situs partner resmi. Harga bisa berubah sewaktu-waktu.")).toBeVisible();
    await expect(page.locator("[data-dock]")).toBeHidden();
  });
});

test("draft listing is 404", async ({ page }) => {
  const res = await page.goto("/yogyakarta/pondok-kaliurang");
  expect(res?.status()).toBe(404);
});

test.describe("WA hidden without any number", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  let saved: string | null = null;
  test.beforeEach(async () => {
    saved = await withDb(async (c) => (await c.query('SELECT "waDefault" FROM "Setting" WHERE id = 1')).rows[0].waDefault);
  });
  test.afterEach(async () => {
    await withDb((c) => c.query('UPDATE "Setting" SET "waDefault" = $1 WHERE id = 1', [saved]));
  });

  test("no WA links", async ({ page }) => {
    await withDb((c) => c.query('UPDATE "Setting" SET "waDefault" = NULL WHERE id = 1'));
    await page.goto(URL);
    await expect(page.getByRole("link", { name: "Pesan sekarang" })).toBeVisible();
    await expect(page.locator('a[href$="/wa"]')).toHaveCount(0);
  });
});
