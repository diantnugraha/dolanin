import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

async function signIn(page: import("@playwright/test").Page, password = "dolanin-dev-123") {
  await page.goto("/admin/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
}

test("redirects to login without a session", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("wrong password shows an error", async ({ page }) => {
  await signIn(page, "salah-total");
  await expect(page.getByText("Username atau password salah")).toBeVisible();
});

test("login shows the sidebar, logout returns to login", async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const nav = page.getByRole("navigation");
  for (const name of ["Dashboard", "Listing", "Kota", "Pengaturan", "Lihat web"]) {
    await expect(nav.getByRole("link", { name })).toBeVisible();
  }
  await nav.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
