import { expect, test } from "@playwright/test";

test.describe("landing mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("tagline, city tiles, promo, type filter", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Yuk, dolan!");
    await expect(page.locator("h1 mark")).toHaveText("hemat");

    const jogja = page.getByRole("link", { name: /Yogyakarta/ }).first();
    await expect(jogja).toHaveAttribute("href", "/yogyakarta");
    await expect(jogja).toContainText("mulai Rp");

    const promo = page.locator("section", { has: page.getByRole("heading", { name: "Promo minggu ini" }) });
    await expect(promo.getByText("Omah Tugu Inn")).toBeVisible();

    await expect(page.getByText("sudah kami pilihkan")).toHaveCount(0);

    const tiles = page.locator("a[data-city]:visible");
    const before = await tiles.count();
    await page.getByRole("link", { name: "Villa", exact: true }).click();
    await expect(page).toHaveURL(/tipe=villa/);
    await expect(tiles).not.toHaveCount(before);
    expect(await tiles.count()).toBeGreaterThan(0);
  });
});

test.describe("landing desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("no 'kota lainnya' tile when only 5 cities", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("a[data-city]:visible")).toHaveCount(5);
    await expect(page.getByText("kota lainnya").locator("visible=true")).toHaveCount(0);
  });
});
