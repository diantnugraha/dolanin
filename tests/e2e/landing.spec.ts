import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const tile = (page: Page, name: string) => page.locator("a[data-city]:visible", { hasText: name });

test.describe("landing mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("tagline, city tiles, promo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Yuk, dolan!");
    await expect(page.locator("h1 mark")).toHaveText("hemat");

    const jogja = page.getByRole("link", { name: /Yogyakarta/ }).first();
    await expect(jogja).toHaveAttribute("href", "/yogyakarta");
    await expect(jogja).toContainText("mulai Rp");

    const promo = page.locator("section", { has: page.getByRole("heading", { name: "Promo minggu ini" }) });
    await expect(promo.getByText("Omah Tugu Inn")).toBeVisible();
    await expect(page.getByText("sudah kami pilihkan")).toHaveCount(0);
  });

  test("type filter keeps only cities with villas", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Villa", exact: true }).click();
    await expect(page).toHaveURL(/tipe=villa/);
    await expect(tile(page, "Yogyakarta")).toBeVisible();
    await expect(tile(page, "Bali")).toBeVisible();
    await expect(tile(page, "Bandung")).toHaveCount(0);
    await expect(tile(page, "Malang & Batu")).toHaveCount(0);
    await expect(tile(page, "Lombok")).toBeVisible();
  });

  test("4 tiles, 'Lihat 1 kota lainnya' link, 5th tile hidden", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Lihat 1 kota lainnya" })).toBeVisible();
    await expect(page.locator("a[data-city]:visible")).toHaveCount(4);
    await expect(tile(page, "Lombok")).toHaveCount(0);
  });

  test("search icon opens dialog and submits to /cari", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Cari" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("searchbox").fill("tugu");
    await dialog.getByRole("button", { name: "Cari" }).click();
    await expect(page).toHaveURL(/\/cari\?q=tugu/);
  });

  test("/kota shows all 5 cities", async ({ page }) => {
    await page.goto("/kota");
    await expect(page.locator("a[data-city]")).toHaveCount(5);
    await expect(tile(page, "Lombok")).toBeVisible();
  });
});

test.describe("landing desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("5 tiles, no 'kota lainnya' link or tile", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("a[data-city]:visible")).toHaveCount(5);
    await expect(page.getByText("kota lainnya").locator("visible=true")).toHaveCount(0);
    // 6th board slot is never a hole: with every city shown it reads "Semua kota"
    await expect(page.getByRole("link", { name: "Semua kota" }).locator("visible=true")).toHaveAttribute("href", "/kota");
  });

  test("tapping a city tile lands on its catalog (shared-element transition)", async ({ page }) => {
    await page.goto("/");
    await tile(page, "Yogyakarta").click();
    await expect(page).toHaveURL(/\/yogyakarta$/);
    await expect(page.getByRole("heading", { level: 1, name: "Yogyakarta" })).toBeVisible();
  });

  test("tapping a city tile works with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await tile(page, "Bali").click();
    await expect(page).toHaveURL(/\/bali$/);
  });
});

test.describe("WA hidden without waDefault", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  let saved: string | null = null;

  const withDb = async <T>(fn: (c: Client) => Promise<T>) => {
    const c = new Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    try {
      return await fn(c);
    } finally {
      await c.end();
    }
  };

  test.beforeEach(async () => {
    saved = await withDb(async (c) => (await c.query('SELECT "waDefault" FROM "Setting" WHERE id = 1')).rows[0].waDefault);
  });
  test.afterEach(async () => {
    await withDb((c) => c.query('UPDATE "Setting" SET "waDefault" = $1 WHERE id = 1', [saved]));
  });

  test("no WA button and no WA block", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(2);
    await withDb((c) => c.query('UPDATE "Setting" SET "waDefault" = NULL WHERE id = 1'));
    await page.reload();
    await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
    await expect(page.getByText("Bingung pilih yang mana?")).toHaveCount(0);
  });
});
