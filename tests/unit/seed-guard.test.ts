import { describe, expect, it } from "vitest";
import { canSeed } from "@/prisma/seed";

const NEON = "postgresql://u:p@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

describe("canSeed", () => {
  it("allows local databases", () => {
    expect(canSeed("postgresql://diantnugraha@localhost:5432/dolanin_dev", {})).toBe(true);
    expect(canSeed("postgresql://u@127.0.0.1:5432/x", {})).toBe(true);
  });
  it("refuses a remote (production) database", () => {
    expect(canSeed(NEON, {})).toBe(false);
    expect(canSeed(NEON, { ALLOW_SEED: "0" })).toBe(false);
  });
  it("refuses a missing or unparsable url", () => {
    expect(canSeed(undefined, {})).toBe(false);
    expect(canSeed("not a url", {})).toBe(false);
  });
  it("ALLOW_SEED=1 overrides", () => {
    expect(canSeed(NEON, { ALLOW_SEED: "1" })).toBe(true);
  });
});
