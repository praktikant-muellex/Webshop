import { describe, it, expect } from "vitest";
import { addMonthsClamped, endOfDay } from "../src/services/dateMath";

describe("addMonthsClamped", () => {
  it("adds whole months to a mid-month date", () => {
    const result = addMonthsClamped(new Date(Date.UTC(2026, 0, 15)), 2);
    expect(result.toISOString().slice(0, 10)).toBe("2026-03-15");
  });

  it("clamps to the last day of a shorter target month instead of rolling over", () => {
    // Oct 31 + 4 months would naively become "Feb 31" -> JS Date rolls that
    // to Mar 3. Clamping must land on Feb 28 (2027 is not a leap year).
    const result = addMonthsClamped(new Date(Date.UTC(2026, 9, 31)), 4);
    expect(result.toISOString().slice(0, 10)).toBe("2027-02-28");
  });

  it("clamps correctly into a leap-year February", () => {
    const result = addMonthsClamped(new Date(Date.UTC(2027, 9, 31)), 4);
    expect(result.toISOString().slice(0, 10)).toBe("2028-02-29");
  });

  it("supports negative offsets (used for the resignation reclaim window)", () => {
    const result = addMonthsClamped(new Date(Date.UTC(2026, 6, 15)), -3);
    expect(result.toISOString().slice(0, 10)).toBe("2026-04-15");
  });
});

describe("endOfDay", () => {
  it("returns 23:59:59.999 UTC on the same calendar day", () => {
    const result = endOfDay(new Date(Date.UTC(2026, 6, 22, 0, 0, 0)));
    expect(result.toISOString()).toBe("2026-07-22T23:59:59.999Z");
  });
});
