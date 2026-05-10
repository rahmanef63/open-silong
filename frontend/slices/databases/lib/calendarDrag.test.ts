import { describe, expect, it } from "vitest";
import {
  parseExistingDate, formatDateValue, shiftYmd, computeDateShift, parseDropTargetId,
} from "./calendarDrag";

describe("parseExistingDate", () => {
  it("extracts ymd from a clean envelope", () => {
    expect(parseExistingDate({ date: "2026-05-10" })).toBe("2026-05-10");
  });
  it("extracts ymd prefix when value carries time", () => {
    expect(parseExistingDate({ date: "2026-05-10T14:30" })).toBe("2026-05-10");
  });
  it("returns null for null/undefined/string/number", () => {
    expect(parseExistingDate(null)).toBeNull();
    expect(parseExistingDate(undefined)).toBeNull();
    expect(parseExistingDate("2026-05-10")).toBeNull();
    expect(parseExistingDate(42)).toBeNull();
  });
  it("returns null when date is missing or malformed", () => {
    expect(parseExistingDate({})).toBeNull();
    expect(parseExistingDate({ date: "tomorrow" })).toBeNull();
  });
});

describe("formatDateValue", () => {
  it("omits time when not given", () => {
    expect(formatDateValue("2026-05-10")).toEqual({ date: "2026-05-10" });
  });
  it("preserves time when given", () => {
    expect(formatDateValue("2026-05-10", "14:30")).toEqual({ date: "2026-05-10", time: "14:30" });
  });
});

describe("shiftYmd", () => {
  it("adds positive days", () => {
    expect(shiftYmd("2026-05-10", 3)).toBe("2026-05-13");
  });
  it("subtracts on negative days", () => {
    expect(shiftYmd("2026-05-01", -1)).toBe("2026-04-30");
  });
  it("handles month boundary", () => {
    expect(shiftYmd("2026-01-31", 1)).toBe("2026-02-01");
  });
  it("handles year boundary", () => {
    expect(shiftYmd("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("returns input unchanged on malformed input", () => {
    expect(shiftYmd("not-a-date", 1)).toBe("not-a-date");
  });
});

describe("computeDateShift", () => {
  it("single-day event: just sets the new start, no end shift", () => {
    expect(computeDateShift("2026-05-10", "2026-05-15", null)).toEqual({
      startYmd: "2026-05-15", endYmd: null,
    });
  });
  it("range event: shifts end by the same delta", () => {
    expect(computeDateShift("2026-05-10", "2026-05-12", "2026-05-13")).toEqual({
      startYmd: "2026-05-12", endYmd: "2026-05-15",
    });
  });
  it("range event: drop on same day is a no-op for end", () => {
    expect(computeDateShift("2026-05-10", "2026-05-10", "2026-05-13")).toEqual({
      startYmd: "2026-05-10", endYmd: "2026-05-13",
    });
  });
  it("falls back to no end when oldStart is null", () => {
    expect(computeDateShift(null, "2026-05-10", "2026-05-13")).toEqual({
      startYmd: "2026-05-10", endYmd: null,
    });
  });
});

describe("parseDropTargetId", () => {
  it("accepts a valid cal-day id", () => {
    expect(parseDropTargetId("cal-day:2026-05-10")).toBe("2026-05-10");
  });
  it("rejects unrelated ids", () => {
    expect(parseDropTargetId("row:abc")).toBeNull();
    expect(parseDropTargetId("cal-empty:e3")).toBeNull();
  });
  it("rejects malformed ymd portion", () => {
    expect(parseDropTargetId("cal-day:tomorrow")).toBeNull();
    expect(parseDropTargetId("cal-day:")).toBeNull();
  });
});
