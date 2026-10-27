import { expect, test } from "@playwright/test";

test("unknown city shows the Indonesian 404 inside the site shell", async ({ page }) => {
  const res = await page.goto("/tidak-ada");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Halaman tidak ditemukan" })).toBeVisible();
  await expect(page.getByText("Mungkin listingnya sudah tidak tayang atau tautannya berubah.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Kembali ke Beranda" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Dolanin, beranda" })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
});

test("unknown listing and unmatched deep URLs get the same 404", async ({ page }) => {
  for (const url of ["/bali/tidak-ada", "/a/b/c/d"]) {
    const res = await page.goto(url);
    expect(res?.status(), url).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Halaman tidak ditemukan" })).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  }
});

test("favicon is the Dolanin pin", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute("href");
  expect(href).toMatch(/^\/icon\.svg/);
  const res = await request.get(href!);
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("#F26B3A");
});

test("/admin pages cannot be framed", async ({ request }) => {
  for (const url of ["/admin", "/admin/login"]) {
    const res = await request.get(url, { maxRedirects: 0 });
    expect(res.headers()["content-security-policy"], url).toBe("frame-ancestors 'none'");
    expect(res.headers()["x-frame-options"], url).toBe("DENY");
  }
});

test("catalog pages have a single main landmark", async ({ page }) => {
  await page.goto("/yogyakarta");
  await expect(page.locator("main")).toHaveCount(1);
});
