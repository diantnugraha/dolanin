import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";
import { hashPassword } from "../../lib/password";

test.use({ viewport: { width: 1280, height: 800 } });
test.describe.configure({ mode: "serial" });

const PASS = "dolanin-dev-123";

async function withDb<T>(fn: (c: Client) => Promise<T>) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function signIn(page: Page, password = PASS) {
  await page.goto("/admin/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.afterEach(async () => {
  const hash = await hashPassword(PASS);
  await withDb(async (c) => {
    await c.query(`UPDATE "Setting" SET "waDefault" = '6281200000000' WHERE id = 1`);
    await c.query(`UPDATE "Admin" SET "passwordHash" = $1, "sessionVersion" = "sessionVersion" + 1, "failedCount" = 0, "lockedUntil" = NULL`, [hash]);
    await c.query(`DELETE FROM "City" WHERE name IN ('Kota Uji', 'Kota Uji Dua')`);
  });
});

test("WA default change shows on landing", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/pengaturan");
  await expect(page.getByLabel("Nomor WhatsApp default")).toHaveValue("6281200000000");
  await page.getByLabel("Nomor WhatsApp default").fill("0813 5555 0000");
  await page.getByRole("button", { name: "Simpan nomor" }).click();
  await expect(page.getByText("Nomor tersimpan")).toBeVisible();
  await page.goto("/");
  await expect(page.locator('a[href^="https://wa.me/6281355550000"]').first()).toBeVisible();
});

test("invalid WA number shows error", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/pengaturan");
  await page.getByLabel("Nomor WhatsApp default").fill("abc");
  await page.getByRole("button", { name: "Simpan nomor" }).click();
  await expect(page.getByText("Nomor WhatsApp tidak valid")).toBeVisible();
});

test("change password: wrong, weak, success keeps session, new password logs in", async ({ page, browser }) => {
  await signIn(page);
  await page.goto("/admin/pengaturan");

  await page.getByLabel("Password lama").fill("salah-banget-1");
  await page.getByLabel("Password baru").fill("password-baru-123");
  await page.getByRole("button", { name: "Ganti password" }).click();
  await expect(page.getByText("Password lama salah")).toBeVisible();

  await page.getByLabel("Password lama").fill(PASS);
  await page.getByLabel("Password baru").fill("pendek");
  await page.getByRole("button", { name: "Ganti password" }).click();
  await expect(page.getByText("Password baru minimal 10 karakter")).toBeVisible();

  await page.getByLabel("Password lama").fill(PASS);
  await page.getByLabel("Password baru").fill("password-baru-123");
  await page.getByRole("button", { name: "Ganti password" }).click();
  await expect(page.getByText("Password berhasil diganti")).toBeVisible();
  await page.goto("/admin/listing");
  await expect(page.getByRole("heading", { name: "Listing", exact: true })).toBeVisible();

  const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const fresh = await ctx.newPage();
  await signIn(fresh, "password-baru-123");
  await ctx.close();
});

test("cities: list, create, reserved name, duplicate, edit, delete, blocked delete", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/kota");
  await expect(page.getByRole("heading", { name: "Kota", exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /Yogyakarta/ })).toContainText("YK");

  await page.getByRole("link", { name: "Tambah kota" }).click();
  await expect(page).toHaveURL(/\/admin\/kota\/baru$/);
  await page.getByLabel("Nama kota").fill("Promo");
  await page.getByLabel("Kode").fill("pr");
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText("Nama kota ini bentrok dengan halaman lain")).toBeVisible();

  await page.getByLabel("Nama kota").fill("Yogyakarta");
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText("Kota ini sudah ada")).toBeVisible();

  await page.getByLabel("Nama kota").fill("Kota Uji");
  await page.getByLabel("Urutan").fill("99");
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page).toHaveURL(/\/admin\/kota\?tersimpan=1$/);
  await expect(page.getByRole("status")).toContainText("Kota tersimpan");
  await expect(page.getByRole("row", { name: /Kota Uji/ })).toContainText("PR");

  await page.getByRole("link", { name: "Ubah Kota Uji" }).click();
  await page.getByLabel("Nama kota").fill("Kota Uji Dua");
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByRole("row", { name: /Kota Uji Dua/ })).toBeVisible();

  await page.getByRole("button", { name: "Hapus Kota Uji Dua" }).click();
  await page.getByRole("button", { name: "Ya, hapus" }).click();
  await expect(page.getByRole("row", { name: /Kota Uji Dua/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Hapus Yogyakarta" }).click();
  await page.getByRole("button", { name: "Ya, hapus" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(/Kota ini masih punya \d+ listing\. Pindahkan atau hapus listingnya dulu\./);
  await expect(page.getByRole("row", { name: /Yogyakarta/ })).toBeVisible();
});
