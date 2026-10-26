import { expect, test, type Page } from "@playwright/test";

const prices = async (page: Page) =>
  (await page.locator("a[data-price]").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-price")))));

test.describe("catalog desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("city page shows name and result count", async ({ page }) => {
    await page.goto("/yogyakarta");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Yogyakarta");
    await expect(page.getByText("5 hasil").first()).toBeVisible();
    await expect(page.locator("a[data-price]")).toHaveCount(5);
  });

  test("tipe=villa shows only villas", async ({ page }) => {
    await page.goto("/yogyakarta?tipe=villa");
    const tags = await page.locator("a[data-price] span:text-is('Villa'), a[data-price] span:text-is('Hotel'), a[data-price] span:text-is('Penginapan')").allTextContents();
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.every((t) => t === "Villa")).toBe(true);
  });

  test("urut=termahal sorts descending", async ({ page }) => {
    await page.goto("/yogyakarta?urut=termahal");
    const p = await prices(page);
    expect(p[0]).toBeGreaterThanOrEqual(p[p.length - 1]);
    expect(p[0]).toBe(480000);
  });

  test("harga=lt150 only under 150000", async ({ page }) => {
    await page.goto("/yogyakarta?harga=lt150");
    const p = await prices(page);
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((x) => x < 150000)).toBe(true);
  });

  test("price preset link drops min/max; min/max form drops preset", async ({ page }) => {
    await page.goto("/yogyakarta?min=100000&max=200000");
    await page.locator("aside").getByRole("link", { name: "< Rp150rb" }).click();
    await expect(page).toHaveURL(/harga=lt150/);
    expect(page.url()).not.toMatch(/[?&]min=/);
    await page.locator("aside").getByLabel("Min").fill("200000");
    await page.locator("aside").getByRole("button", { name: "Terapkan" }).click();
    await expect(page).toHaveURL(/min=200000/);
    expect(page.url()).not.toMatch(/harga=/);
  });

  test("city switch keeps params", async ({ page }) => {
    await page.goto("/yogyakarta?urut=termahal");
    await page.locator("aside").getByRole("link", { name: "Bali" }).click();
    await expect(page).toHaveURL(/\/bali\?urut=termahal/);
  });

  test("type checkbox shows counts and toggles", async ({ page }) => {
    await page.goto("/yogyakarta");
    const villa = page.locator("aside").getByRole("link", { name: /Villa/ });
    await expect(villa).toContainText("1");
    await villa.click();
    await expect(page).toHaveURL(/tipe=villa/);
    await expect(page.locator("a[data-price]")).toHaveCount(1);
  });

  test("empty result shows message and reset", async ({ page }) => {
    await page.goto("/yogyakarta?min=9000000");
    await expect(page.getByText("Belum ada penginapan yang cocok. Coba ubah filternya.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Reset" }).first()).toHaveAttribute("href", "/yogyakarta");
  });

  test("/promo: every card has the Promo stamp", async ({ page }) => {
    await page.goto("/promo");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Semua promo");
    const n = await page.locator("a[data-price]").count();
    expect(n).toBeGreaterThanOrEqual(4);
    await expect(page.locator("a[data-price]", { hasText: "Promo" })).toHaveCount(n);
  });

  test("landing links to /promo", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Semua promo" }).click();
    await expect(page).toHaveURL(/\/promo$/);
  });

  test("/cari?q=Bali redirects to /bali", async ({ page }) => {
    await page.goto("/cari?q=Bali");
    await expect(page).toHaveURL(/\/bali$/);
  });

  test("/cari?q=tugu lists Omah Tugu Inn; empty q goes home", async ({ page }) => {
    await page.goto("/cari?q=tugu");
    await expect(page.getByText("Omah Tugu Inn")).toBeVisible();
    await page.goto("/cari?q=");
    await expect(page).toHaveURL(/\/$/);
  });

  test("unknown city is 404", async ({ page }) => {
    const res = await page.goto("/tidak-ada");
    expect(res?.status()).toBe(404);
  });
});

test.describe("catalog mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Harga chip opens the filter sheet", async ({ page }) => {
    await page.goto("/yogyakarta");
    await page.getByRole("button", { name: "Harga" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("link", { name: "Rp150–300rb" }).click();
    await expect(page).toHaveURL(/harga=150-300/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("no horizontal scroll", async ({ page }) => {
    await page.goto("/yogyakarta");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
