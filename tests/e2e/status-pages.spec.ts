import { expect, test } from "@playwright/test";

test("/admin pages cannot be framed", async ({ request }) => {
  for (const url of ["/admin", "/admin/login"]) {
    const res = await request.get(url, { maxRedirects: 0 });
    expect(res.headers()["content-security-policy"], url).toBe("frame-ancestors 'none'");
    expect(res.headers()["x-frame-options"], url).toBe("DENY");
  }
});
