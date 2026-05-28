import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatDateValue,
  formatTime,
  formatYmd,
  parseYmdToLocal,
} from "./dateFormat";

describe("parseYmdToLocal", () => {
  it("parses YYYY-MM-DD into a local-midnight Date", () => {
    const dt = parseYmdToLocal("2026-05-13");
    expect(dt).not.toBeNull();
    expect(dt!.getFullYear()).toBe(2026);
    expect(dt!.getMonth()).toBe(4); // May = 4 (0-indexed)
    expect(dt!.getDate()).toBe(13);
    expect(dt!.getHours()).toBe(0);
    expect(dt!.getMinutes()).toBe(0);
  });

  it("applies an optional HH:mm", () => {
    const dt = parseYmdToLocal("2026-05-13", "15:45");
    expect(dt!.getHours()).toBe(15);
    expect(dt!.getMinutes()).toBe(45);
  });

  it("ignores a malformed time but keeps the date", () => {
    const dt = parseYmdToLocal("2026-05-13", "3pm");
    expect(dt!.getHours()).toBe(0);
    expect(dt!.getMinutes()).toBe(0);
  });

  it("returns null on a malformed date", () => {
    expect(parseYmdToLocal("2026-5-3")).toBeNull();
    expect(parseYmdToLocal("not-a-date")).toBeNull();
    expect(parseYmdToLocal("2026/05/13")).toBeNull();
  });
});

describe("formatTime", () => {
  it("12h: converts midnight and noon correctly", () => {
    expect(formatTime("00:00", "12h")).toBe("12:00 AM");
    expect(formatTime("12:00", "12h")).toBe("12:00 PM");
  });

  it("12h: morning and afternoon", () => {
    expect(formatTime("09:05", "12h")).toBe("9:05 AM");
    expect(formatTime("13:07", "12h")).toBe("1:07 PM");
    expect(formatTime("23:59", "12h")).toBe("11:59 PM");
  });

  it("24h: zero-pads the hour", () => {
    expect(formatTime("09:05", "24h")).toBe("09:05");
    expect(formatTime("00:00", "24h")).toBe("00:00");
    expect(formatTime("23:59", "24h")).toBe("23:59");
  });

  it("defaults to 12h", () => {
    expect(formatTime("14:30")).toBe("2:30 PM");
  });

  it("returns the raw input when malformed", () => {
    expect(formatTime("nope")).toBe("nope");
    expect(formatTime("9:5")).toBe("9:5");
  });
});

describe("formatYmd — timezone-independent formats", () => {
  it("mdy / dmy / ymd render the exact numeric layout", () => {
    expect(formatYmd("2026-05-13", "mdy")).toBe("5/13/2026");
    expect(formatYmd("2026-05-13", "dmy")).toBe("13/5/2026");
    expect(formatYmd("2026-05-13", "ymd")).toBe("2026/05/13");
  });

  it("ymd zero-pads single-digit month and day", () => {
    expect(formatYmd("2026-01-09", "ymd")).toBe("2026/01/09");
    expect(formatYmd("2026-01-09", "mdy")).toBe("1/9/2026");
  });

  it("returns the raw input on a malformed date", () => {
    expect(formatYmd("garbage", "mdy")).toBe("garbage");
  });

  it("full / short produce a non-empty locale string (no crash)", () => {
    const full = formatYmd("2026-05-13", "full");
    const short = formatYmd("2026-05-13", "short");
    expect(full).toContain("2026");
    expect(short.length).toBeGreaterThan(0);
    expect(short).not.toBe("2026-05-13");
  });

  it("defaults to the full format", () => {
    expect(formatYmd("2026-05-13")).toContain("2026");
  });
});

describe("formatYmd — relative (now-dependent)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 13, 10, 0, 0)); // 2026-05-13 10:00 local
  });
  afterEach(() => vi.useRealTimers());

  it("anchors today / yesterday / tomorrow", () => {
    expect(formatYmd("2026-05-13", "relative")).toBe("Today");
    expect(formatYmd("2026-05-12", "relative")).toBe("Yesterday");
    expect(formatYmd("2026-05-14", "relative")).toBe("Tomorrow");
  });

  it("uses the 'In N days' / 'N days ago' band for 2..6 days", () => {
    expect(formatYmd("2026-05-16", "relative")).toBe("In 3 days");
    expect(formatYmd("2026-05-19", "relative")).toBe("In 6 days");
    expect(formatYmd("2026-05-10", "relative")).toBe("3 days ago");
  });

  it("falls back to an absolute date at the ±7-day boundary", () => {
    expect(formatYmd("2026-05-20", "relative")).toContain("2026"); // +7 → absolute
    expect(formatYmd("2026-05-06", "relative")).toContain("2026"); // -7 → absolute
  });
});

describe("formatDateValue", () => {
  it("returns empty string when there is no date", () => {
    expect(formatDateValue({})).toBe("");
    expect(formatDateValue({ time: "10:00" })).toBe("");
  });

  it("renders date only when time is not included", () => {
    expect(formatDateValue({ date: "2026-05-13" }, { dateFormat: "mdy" })).toBe("5/13/2026");
  });

  it("appends time only when dateIncludeTime is set", () => {
    const prop = { dateFormat: "mdy" as const, timeFormat: "24h" as const, dateIncludeTime: true };
    expect(formatDateValue({ date: "2026-05-13", time: "09:30" }, prop)).toBe("5/13/2026 09:30");
    // same value, but the property does not opt into time → time suppressed
    expect(
      formatDateValue({ date: "2026-05-13", time: "09:30" }, { ...prop, dateIncludeTime: false }),
    ).toBe("5/13/2026");
  });

  it("renders an end date as a range with the arrow", () => {
    expect(
      formatDateValue({ date: "2026-05-13", end: "2026-05-20" }, { dateFormat: "mdy" }),
    ).toBe("5/13/2026 → 5/20/2026");
  });

  it("renders endTime-only as a time range when time is shown", () => {
    const prop = { dateFormat: "mdy" as const, timeFormat: "24h" as const, dateIncludeTime: true };
    expect(
      formatDateValue({ date: "2026-05-13", time: "09:00", endTime: "17:30" }, prop),
    ).toBe("5/13/2026 09:00 → 17:30");
  });

  it("combines end date + end time", () => {
    const prop = { dateFormat: "mdy" as const, timeFormat: "24h" as const, dateIncludeTime: true };
    expect(
      formatDateValue(
        { date: "2026-05-13", time: "09:00", end: "2026-05-14", endTime: "10:00" },
        prop,
      ),
    ).toBe("5/13/2026 09:00 → 5/14/2026 10:00");
  });
});
