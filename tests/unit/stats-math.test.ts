import { describe, expect, it } from "vitest";
import { clickRatio, pctChange, periodBounds } from "@/lib/stats";

describe("stats math", () => {
  it("pctChange", () => {
    expect(pctChange(118, 100)).toBeCloseTo(0.18);
    expect(pctChange(5, 0)).toBeNull();
  });
  it("clickRatio = clicks / views", () => {
    expect(clickRatio(1552, 9840)).toBeCloseTo(0.1577, 4);
    expect(clickRatio(3, 6)).toBe(0.5);
    expect(clickRatio(3, 0)).toBeNull();
  });
  it("periodBounds uses WIB midnight", () => {
    const now = new Date("2026-10-26T10:00:00+07:00");
    const b = periodBounds(30, now);
    expect(b.from.toISOString()).toBe("2026-09-26T17:00:00.000Z");
    expect(b.to).toEqual(now);
    expect(b.prevTo).toEqual(b.from);
    expect(b.prevFrom.toISOString()).toBe("2026-08-27T17:00:00.000Z");
  });
});
