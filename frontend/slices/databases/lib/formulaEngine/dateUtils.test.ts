import { describe, expect, it } from "vitest";
import { addUnit, diffUnit, formatDate, DAY_MS } from "./dateUtils";

const d = (iso: string) => new Date(iso);

describe("dateUtils addUnit", () => {
  it("day / days (+/-) → date-only output", () => {
    expect(addUnit(d("2026-01-01T00:00:00Z"), 5, "day")).toBe("2026-01-06");
    expect(addUnit(d("2026-01-10T00:00:00Z"), -5, "days")).toBe("2026-01-05");
  });
  it("week → +7 days each", () => {
    expect(addUnit(d("2026-01-01T00:00:00Z"), 1, "week")).toBe("2026-01-08");
    expect(addUnit(d("2026-01-01T00:00:00Z"), 2, "weeks")).toBe("2026-01-15");
  });
  it("month advances calendar month", () => {
    expect(addUnit(d("2026-01-15T00:00:00Z"), 2, "month")).toBe("2026-03-15");
  });
  it("month rollover follows JS Date overflow (Jan 31 + 1mo → Mar)", () => {
    // Feb has 28 days in 2026 → setUTCMonth overflows into March.
    expect(addUnit(d("2026-01-31T00:00:00Z"), 1, "month")).toBe("2026-03-03");
  });
  it("year (+ leap awareness via JS Date)", () => {
    expect(addUnit(d("2026-05-10T00:00:00Z"), 1, "year")).toBe("2027-05-10");
  });
  it("hour / minute → FULL ISO datetime (not date-only)", () => {
    expect(addUnit(d("2026-01-01T00:00:00Z"), 5, "hour")).toBe("2026-01-01T05:00:00.000Z");
    expect(addUnit(d("2026-01-01T00:00:00Z"), 90, "minutes")).toBe("2026-01-01T01:30:00.000Z");
  });
  it("unknown unit defaults to day", () => {
    expect(addUnit(d("2026-01-01T00:00:00Z"), 3, "fortnight")).toBe("2026-01-04");
  });
  it("date-only units produce a 10-char string", () => {
    expect(addUnit(d("2026-01-01T00:00:00Z"), 1, "day")).toHaveLength(10);
    expect(addUnit(d("2026-01-01T00:00:00Z"), 1, "year")).toHaveLength(10);
  });
});

describe("dateUtils diffUnit", () => {
  it("days / weeks via ms rounding", () => {
    expect(diffUnit(d("2026-01-01T00:00:00Z"), d("2026-01-11T00:00:00Z"), "days")).toBe(10);
    expect(diffUnit(d("2026-01-01T00:00:00Z"), d("2026-01-15T00:00:00Z"), "weeks")).toBe(2);
  });
  it("months is CALENDAR-based, not ms-based", () => {
    expect(diffUnit(d("2026-01-31T00:00:00Z"), d("2026-04-01T00:00:00Z"), "months")).toBe(3);
    // crosses a year boundary
    expect(diffUnit(d("2025-11-01T00:00:00Z"), d("2026-02-01T00:00:00Z"), "months")).toBe(3);
  });
  it("years is calendar-year delta", () => {
    expect(diffUnit(d("2024-12-31T00:00:00Z"), d("2027-01-01T00:00:00Z"), "years")).toBe(3);
  });
  it("hours / minutes", () => {
    expect(diffUnit(d("2026-01-01T00:00:00Z"), d("2026-01-01T05:00:00Z"), "hours")).toBe(5);
    expect(diffUnit(d("2026-01-01T00:00:00Z"), d("2026-01-01T01:30:00Z"), "minutes")).toBe(90);
  });
  it("negative diff when b precedes a", () => {
    expect(diffUnit(d("2026-01-11T00:00:00Z"), d("2026-01-01T00:00:00Z"), "days")).toBe(-10);
  });
  it("unknown unit defaults to days", () => {
    expect(diffUnit(d("2026-01-01T00:00:00Z"), d("2026-01-03T00:00:00Z"), "eons")).toBe(2);
  });
  it("DAY_MS constant", () => {
    expect(DAY_MS).toBe(86_400_000);
  });
});

describe("dateUtils formatDate", () => {
  it("replaces all tokens with zero-padded UTC parts", () => {
    const date = d("2026-03-07T09:05:08Z");
    expect(formatDate(date, "YYYY-MM-DD")).toBe("2026-03-07");
    expect(formatDate(date, "DD/MM/YYYY")).toBe("07/03/2026");
    expect(formatDate(date, "HH:mm:ss")).toBe("09:05:08");
  });
  it("single-digit month/day are padded", () => {
    expect(formatDate(d("2026-01-02T00:00:00Z"), "MM-DD")).toBe("01-02");
  });
  it("literal text around tokens is preserved", () => {
    expect(formatDate(d("2026-12-25T00:00:00Z"), "Day DD of MM, YYYY")).toBe("Day 25 of 12, 2026");
  });
  it("a format with no tokens returns itself", () => {
    expect(formatDate(d("2026-01-01T00:00:00Z"), "no tokens here")).toBe("no tokens here");
  });
});
