import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

test.use({ viewport: { width: 1280, height: 900 } });
test.describe.configure({ mode: "serial" });

const PASS = "dolanin-dev-123";
const HOUR = 3_600_000;

async function withDb<T>(fn: (c: Client) => Promise<T>) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill(PASS);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

// Known counts inside the 30-day window: 6 Pesan, 3 WA, 20 views. Previous period: 3 Pesan (so Pesan delta = +100%).
test.beforeAll(async () => {
  await withDb(async (c) => {
    await c.query(`DELETE FROM "Event"`);
    const { rows } = await c.query(`SELECT id, "cityId", type FROM "Listing" WHERE published ORDER BY name LIMIT 1`);
    const l = rows[0];
    const at = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
    const ins = async (kind: string, n: number, msAgo: number) => {
      for (let i = 0; i < n; i++) {
        await c.query(
          `INSERT INTO "Event" ("listingId", kind, "cityId", type, "createdAt") VALUES ($1, $2::"EventKind", $3, $4::"ListingType", $5::timestamp)`,
          [l.id, kind, l.cityId, l.type, at(msAgo + i * 1000)],
        );
      }
    };
    await ins("PESAN", 6, 2 * HOUR);
    await ins("WA", 3, 2 * HOUR);
    await ins("VIEW", 20, 2 * HOUR);
    await ins("PESAN", 3, 40 * 24 * HOUR);
  });
});

test.afterAll(async () => {
  await withDb((c) => c.query(`DELETE FROM "Event"`));
});

test("shows KPI totals matching the seeded events", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("Klik tombol Pesan")).toBeVisible();
  await expect(page.getByTestId("kpi-pesan")).toContainText("6");
  await expect(page.getByTestId("kpi-pesan")).toContainText("100%");
  await expect(page.getByTestId("kpi-wa")).toContainText("3");
  await expect(page.getByTestId("kpi-views")).toContainText("20");
  await expect(page.getByTestId("kpi-ratio")).toContainText("45%");
  await expect(page.getByText("Klik bukan pemesanan.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("NaN");
});

test("rentang=7 changes the date range label", async ({ page }) => {
  await signIn(page);
  const label = page.getByTestId("range-label");
  await expect(label).toHaveText(/^\d{1,2} \p{L}{3,4} (\d{4} )?– \d{1,2} \p{L}{3,4} \d{4}$/u);
  const d30 = await label.innerText();
  await page.goto("/admin?rentang=7");
  const d7 = await label.innerText();
  expect(d7).not.toBe(d30);
  await page.goto("/admin?rentang=999&tipe=xx&kota=nope");
  await expect(label).toHaveText(d30);
});

test("hover on chart shows tooltip with Pesan; table view has 30 rows", async ({ page }) => {
  await signIn(page);
  const svg = page.getByRole("img", { name: /Grafik garis/ });
  const box = (await svg.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole("tooltip").first()).toContainText("Pesan");
  await page.getByText("Lihat sebagai tabel").click();
  await expect(page.locator("details table tbody tr")).toHaveCount(30);
});

test("keyboard arrows move the chart tooltip", async ({ page }) => {
  await signIn(page);
  const svg = page.getByRole("img", { name: /Grafik garis/ });
  await svg.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tooltip").first()).toContainText("Chat WA");
});

test("empty events: zeros, ratio dash, empty message, no NaN", async ({ page }) => {
  await withDb((c) => c.query(`DELETE FROM "Event"`));
  await signIn(page);
  await page.goto("/admin?rentang=7");
  await expect(page.getByTestId("kpi-pesan")).toContainText("0");
  await expect(page.getByTestId("kpi-ratio")).toContainText("–");
  await expect(page.getByText("Belum ada data untuk periode ini.").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("NaN");
  await expect(page.getByRole("img", { name: /Grafik garis/ })).toBeVisible();
});
