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
    await c.query(`DELETE FROM "Listing" WHERE name IN ('Wisma Uji', 'Wisma Foto Uji')`);
    await c.query(`DELETE FROM "Media" WHERE key IN ('e2e-failed-guid', 'e2e-processing-guid')`);
    await c.query(`UPDATE "Listing" SET name = 'Hotel Gedong Kuning' WHERE name = 'Hotel Gedong Kuning X'`);
    await c.query(`UPDATE "Listing" SET facilities = '{wifi,ac,sarapan}' WHERE slug = 'kamar-dago-atas'`);
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

test("Enter in a text field saves normally and keeps the listing published", async ({ page }) => {
  await page.getByRole("row", { name: /Hotel Gedong Kuning/ }).getByRole("link", { name: /Ubah/ }).click();
  const name = page.getByLabel("Nama", { exact: true });
  await name.fill("Hotel Gedong Kuning X");
  await name.press("Enter");
  await expect(page).toHaveURL(/\/admin\/listing\?tersimpan=1$/);
  await expect(page.getByRole("row", { name: /Hotel Gedong Kuning X/ })).toContainText("Tayang");
});

test("a stored facility key that is no longer offered is dropped on save, not a hidden error", async ({ page }) => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  let id: string;
  try {
    id = (await c.query(`UPDATE "Listing" SET facilities = '{wifi,kipas}' WHERE slug = 'kamar-dago-atas' RETURNING id`)).rows[0].id;
  } finally {
    await c.end();
  }
  await page.goto(`/admin/listing/${id}`);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/listing\?tersimpan=1$/);
  const c2 = new Client({ connectionString: process.env.DATABASE_URL });
  await c2.connect();
  try {
    expect((await c2.query(`SELECT facilities FROM "Listing" WHERE id = $1`, [id])).rows[0].facilities).toEqual(["wifi"]);
  } finally {
    await c2.end();
  }
});

test("a failed save keeps the form and shows an error", async ({ page }) => {
  await page.goto("/admin/listing/baru");
  await page.route("**/admin/listing/baru", (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
  await page.getByLabel("Nama", { exact: true }).fill("Wisma Gagal");
  await page.getByRole("button", { name: "Simpan draf" }).click();
  await expect(page.getByText("Gagal menyimpan. Periksa koneksi lalu coba lagi.")).toBeVisible();
  await expect(page.getByLabel("Nama", { exact: true })).toHaveValue("Wisma Gagal");
});

async function fillRequired(page: Page, name: string) {
  await page.getByLabel("Nama", { exact: true }).fill(name);
  await page.getByLabel("Kota").selectOption({ label: "Bandung" });
  await page.getByLabel("Area / alamat").fill("Dago");
  await page.getByLabel("Harga per malam").fill("150000");
  await page.getByLabel("Deskripsi").fill("Penginapan uji coba.");
  await page.getByLabel(/Link affiliate/).fill("https://example.com/aff");
}

test("photo upload: two WebP PUTs straight to S3, no SDK checksum, immutable cache; saved as one PHOTO", async ({ page }) => {
  const puts: { url: string; headers: Record<string, string> }[] = [];
  // No real AWS: answer the bucket host ourselves (preflight included).
  await page.route("https://test-bucket.s3.ap-southeast-1.amazonaws.com/**", async (route) => {
    const r = route.request();
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "PUT",
      "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
    };
    if (r.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (r.method() === "PUT") puts.push({ url: r.url(), headers: await r.allHeaders() });
    return route.fulfill({ status: 200, headers: cors });
  });

  await page.goto("/admin/listing/baru");
  await fillRequired(page, "Wisma Foto Uji");
  await page.getByLabel("Pilih foto atau video").setInputFiles("tests/e2e/fixtures/photo.png");
  await expect.poll(() => puts.length).toBe(2);
  await expect(page.getByRole("button", { name: "Simpan", exact: true })).toBeEnabled(); // upload finished
  await expect(page.getByAltText("Foto 1")).toBeVisible();

  expect(puts.map((p) => new URL(p.url).pathname)).toEqual([
    expect.stringMatching(/^\/p\/[0-9a-f-]{36}-800\.webp$/),
    expect.stringMatching(/^\/p\/[0-9a-f-]{36}-1600\.webp$/),
  ]);
  for (const p of puts) {
    expect(p.url).not.toMatch(/x-amz-checksum/i);
    expect(p.url).not.toMatch(/x-amz-sdk-checksum-algorithm/i);
    expect(p.headers["content-type"]).toBe("image/webp");
    expect(p.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  }

  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/listing\?tersimpan=1$/);
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const { rows } = await c.query(
      `SELECT m.kind, m.key FROM "Media" m JOIN "Listing" l ON l.id = m."listingId" WHERE l.name = 'Wisma Foto Uji'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("PHOTO");
    expect(rows[0].key).toMatch(/^p\//);
    expect(new URL(puts[0].url).pathname).toBe(`/${rows[0].key}-800.webp`);
  } finally {
    await c.end();
  }
});

// A file dropped outside the media zone must not make the browser open it (that loses the form).
async function dropFileOn(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const target = document.querySelector(sel)!;
    const dt = new DataTransfer();
    dt.items.add(new File(["x"], "foto.png", { type: "image/png" }));
    const fire = (type: string) => {
      const e = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
      target.dispatchEvent(e);
      return e.defaultPrevented;
    };
    return { dragover: fire("dragover"), drop: fire("drop") };
  }, selector);
}

for (const [form, path] of [["listing", "/admin/listing/baru"], ["kota", "/admin/kota/baru"]] as const) {
  test(`${form} form: a file dropped on the Nama field is swallowed, the form stays`, async ({ page }) => {
    await page.goto(path);
    const name = page.locator("#name");
    await name.fill("Nama Belum Disimpan");
    expect(await dropFileOn(page, "#name")).toEqual({ dragover: true, drop: true });
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(name).toHaveValue("Nama Belum Disimpan");
  });
}

test("media manager labels a FAILED video apart from a PROCESSING one", async ({ page }) => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  let id: string;
  try {
    id = (await c.query(`SELECT id FROM "Listing" WHERE slug = 'kamar-kayu-malioboro'`)).rows[0].id;
    await c.query(
      `INSERT INTO "Media" (id, "listingId", kind, key, status, "sortOrder") VALUES
         ('e2e-failed', $1, 'VIDEO', 'e2e-failed-guid', 'FAILED', 10),
         ('e2e-processing', $1, 'VIDEO', 'e2e-processing-guid', 'PROCESSING', 11)`,
      [id],
    );
  } finally {
    await c.end();
  }
  await page.goto(`/admin/listing/${id}`);
  await expect(page.getByText("Gagal diproses — hapus lalu unggah ulang")).toHaveCount(1);
  await expect(page.getByText("Sedang diproses")).toHaveCount(1);
});
