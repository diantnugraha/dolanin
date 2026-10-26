import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

test.use({ viewport: { width: 1280, height: 800 } });
test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("dolanin-dev-123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function cleanup() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query(`DELETE FROM "Listing" WHERE name = 'Wisma Uji'`);
  } finally {
    await c.end();
  }
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/listing");
});
test.afterAll(cleanup);

test("list shows seeded listings with status", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Listing", exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /Omah Tugu Inn/ })).toContainText("Tayang");
  await expect(page.getByRole("row", { name: /Pondok Kaliurang/ })).toContainText("Draf");
  await expect(page.getByText("Klik 30 hari")).toHaveCount(0);
});

test("filter by status draf", async ({ page }) => {
  await page.getByLabel("Status").selectOption("draf");
  await page.getByRole("button", { name: "Cari" }).click();
  await expect(page.getByRole("row", { name: /Pondok Kaliurang/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Omah Tugu Inn/ })).toHaveCount(0);
});

test("create draft, edit price, validation, preview, delete", async ({ page }) => {
  await page.getByRole("link", { name: "Tambah listing" }).click();
  await expect(page).toHaveURL(/\/admin\/listing\/baru$/);

  await page.getByLabel("Nama", { exact: true }).fill("Wisma Uji");
  const preview = page.getByRole("region", { name: "Pratinjau kartu" });
  await expect(preview).toContainText("Wisma Uji");
  await page.getByLabel("Nama", { exact: true }).fill("Wisma Uji Baru");
  await expect(preview).toContainText("Wisma Uji Baru");
  await page.getByLabel("Nama", { exact: true }).fill("Wisma Uji");

  await page.getByLabel("Kota").selectOption({ label: "Bandung" });
  await page.getByRole("radio", { name: "Penginapan" }).check();
  await page.getByLabel("Area / alamat").fill("Dago");
  await page.getByLabel("Harga per malam").fill("150000");
  await page.getByLabel("Harga per malam").blur();
  await expect(page.getByLabel("Harga per malam")).toHaveValue("150.000");
  await page.getByLabel("Deskripsi").fill("Penginapan uji coba.");
  await expect(page.getByText("20 / 300")).toBeVisible();
  await page.getByLabel(/Link affiliate/).fill("https://example.com/aff");

  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByText("Tambahkan minimal 1 foto atau video")).toBeVisible();

  await page.getByRole("button", { name: "Simpan draf" }).click();
  await expect(page).toHaveURL(/\/admin\/listing\?tersimpan=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Listing tersimpan" })).toBeVisible();
  const row = page.getByRole("row", { name: /Wisma Uji/ });
  await expect(row).toContainText("Draf");

  await row.getByRole("link", { name: /Ubah/ }).click();
  await page.getByLabel("Harga per malam").fill("250.000");
  await page.getByRole("button", { name: "Simpan draf" }).click();
  await expect(page.getByRole("row", { name: /Wisma Uji/ })).toContainText("Rp250.000");

  await page.getByRole("row", { name: /Wisma Uji/ }).getByRole("button", { name: /Menu/ }).click();
  await page.getByRole("menuitem", { name: "Hapus" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Hapus Wisma Uji? Foto, video, dan statistiknya ikut terhapus.");
  await dialog.getByRole("button", { name: "Ya, hapus" }).click();
  await expect(page.getByRole("row", { name: /Wisma Uji/ })).toHaveCount(0);
});
