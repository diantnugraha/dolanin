import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword, login } from "@/lib/auth";
import { resetDb } from "./setup";

beforeEach(async () => {
  await resetDb();
  await db.admin.create({ data: { id: 1, username: "admin", passwordHash: await hashPassword("benar-benar-1") } });
});

describe("login", () => {
  it("accepts correct credentials", async () => {
    expect(await login("admin", "benar-benar-1")).toBe("ok");
  });
  it("answers 'invalid' for unknown user and wrong password alike", async () => {
    expect(await login("hantu", "apa-saja")).toBe("invalid");
    expect(await login("admin", "salah")).toBe("invalid");
  });
  it("locks after 5 failures, even for the right password", async () => {
    for (let i = 0; i < 5; i++) expect(await login("admin", "salah")).toBe("invalid");
    expect(await login("admin", "benar-benar-1")).toBe("locked");
  });
  it("unlocks once lockedUntil passes and resets the counter", async () => {
    for (let i = 0; i < 5; i++) await login("admin", "salah");
    await db.admin.update({ where: { id: 1 }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    expect(await login("admin", "benar-benar-1")).toBe("ok");
    const a = await db.admin.findUniqueOrThrow({ where: { id: 1 } });
    expect(a.failedCount).toBe(0);
    expect(a.lockedUntil).toBeNull();
  });
  it("cannot bypass the lockout with parallel wrong attempts", async () => {
    await Promise.all(Array.from({ length: 10 }, () => login("admin", "salah")));
    expect(await login("admin", "benar-benar-1")).toBe("locked");
  });
});
