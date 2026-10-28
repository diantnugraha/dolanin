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

// Known counts inside the 30-day window: 6 Agoda + 3 WhatsApp + 1 legacy (no channel) clicks, 20 views.
// Previous period: 5 Agoda clicks (so the click delta = +100%).
test.beforeAll(async () => {
  await withDb(async (c) => {
    await c.query(`DELETE FROM "Event"`);
    const { rows } = await c.query(`SELECT id, "cityId", type FROM "Listing" WHERE published ORDER BY name LIMIT 1`);
    const l = rows[0];
    const at = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
    const ins = async (kind: string, channel: string | null, n: number, msAgo: number) => {
      for (let i = 0; i < n; i++) {
        await c.query(
          `INSERT INTO "Event" ("listingId", kind, channel, "cityId", type, "createdAt")
           VALUES ($1, $2::"EventKind", $3::"BookingChannel", $4, $5::"ListingType", $6::timestamp)`,
          [l.id, kind, channel, l.cityId, l.type, at(msAgo + i * 1000)],
        );
      }
    };
    await ins("CLICK", "AGODA", 6, 2 * HOUR);
    await ins("CLICK", "WHATSAPP", 3, 2 * HOUR);
    await ins("CLICK", null, 1, 2 * HOUR);
    await ins("VIEW", null, 20, 2 * HOUR);
    await ins("CLICK", "AGODA", 5, 40 * 24 * HOUR);
  });
});

test.afterAll(async () => {
  await withDb((c) => c.query(`DELETE FROM "Event"`));
});

test("shows KPI totals matching the seeded events", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("Total klik")).toBeVisible();
  const val = (k: string) => page.locator(`[data-kpi="${k}"]`);
  await expect(val("clicks")).toHaveText("10");
  await expect(page.getByTestId("kpi-clicks").getByTestId("delta")).toContainText("100%");
  // previous period has no views: pctChange is null, so no delta pill
  await expect(page.getByTestId("kpi-views").getByTestId("delta")).toHaveCount(0);
  await expect(val("views")).toHaveText("20");
  await expect(val("ratio")).toHaveText("50%");
  await expect(val("top")).toHaveText("Agoda");
  await expect(page.getByTestId("kpi-top")).toContainText("60% dari semua klik");
  await expect(page.getByText("Klik bukan pemesanan.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("NaN");
});

test("clicks per channel: most first, Lainnya last", async ({ page }) => {
  await signIn(page);
  const card = page.getByRole("heading", { name: "Klik per channel" }).locator("xpath=ancestor::div[contains(@class, 'card')][1]");
  const names = await card.locator("[tabindex='0'] > span").allInnerTexts();
  expect(names.map((n) => n.trim())).toEqual(["Agoda", "WhatsApp", "Lainnya"]);
  await card.locator("[tabindex='0']").first().hover();
  await expect(card.getByRole("tooltip")).toContainText("6");
  await expect(card.getByRole("tooltip")).toContainText("klik · 60%");
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

test("hover on chart shows tooltip with clicks; table view has 30 rows", async ({ page }) => {
  await signIn(page);
  const svg = page.getByRole("img", { name: /Grafik garis/ });
  const chart = svg.locator("xpath=.."); // the line chart's own container, not the city bars
  const box = (await svg.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const tip = chart.getByRole("tooltip");
  await expect(tip).toContainText(/\d{1,2} \p{L}{3}/u);
  await expect(tip).toContainText("klik");
  await page.getByText("Lihat sebagai tabel").click();
  await expect(page.locator("details table tbody tr")).toHaveCount(30);
});

test("keyboard arrows move the chart tooltip", async ({ page }) => {
  await signIn(page);
  const svg = page.getByRole("img", { name: /Grafik garis/ });
  await svg.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(svg.locator("xpath=..").getByRole("tooltip")).toContainText("klik");
});

test("empty events: zeros, ratio dash, empty message, no NaN", async ({ page }) => {
  await withDb((c) => c.query(`DELETE FROM "Event"`));
  await signIn(page);
  await page.goto("/admin?rentang=7");
  await expect(page.locator('[data-kpi="clicks"]')).toHaveText("0");
  await expect(page.locator('[data-kpi="top"]')).toHaveText("–");
  await expect(page.locator('[data-kpi="ratio"]')).toHaveText("–");
  await expect(page.getByTestId("delta")).toHaveCount(0);
  await expect(page.getByText("Belum ada data untuk periode ini.").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("NaN");
  await expect(page.getByRole("img", { name: /Grafik garis/ })).toBeVisible();
});
