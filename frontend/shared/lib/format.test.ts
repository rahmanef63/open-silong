import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { colorClass, formatRelTime, OPTION_COLORS } from "./format";

describe("colorClass", () => {
  it("returns gray fallback for undefined", () => {
    expect(colorClass()).toBe(colorClass("gray"));
  });
  it("returns gray fallback for unknown color", () => {
    expect(colorClass("octarine")).toBe(colorClass("gray"));
  });
  it("returns specific class for known color", () => {
    expect(colorClass("red")).not.toBe(colorClass("gray"));
    expect(colorClass("blue")).toContain("210");
  });
});

describe("OPTION_COLORS", () => {
  it("contains canonical Notion-style names", () => {
    expect(OPTION_COLORS).toEqual(
      expect.arrayContaining(["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"]),
    );
  });
});

describe("formatRelTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-05T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for <1 minute ago", () => {
    expect(formatRelTime(Date.now() - 30_000)).toBe("just now");
  });

  it("returns minutes for <1 hour", () => {
    expect(formatRelTime(Date.now() - 5 * 60_000)).toBe("5m ago");
  });

  it("returns hours for <1 day", () => {
    expect(formatRelTime(Date.now() - 3 * 60 * 60_000)).toBe("3h ago");
  });

  it("returns days for <1 week", () => {
    expect(formatRelTime(Date.now() - 4 * 24 * 60 * 60_000)).toBe("4d ago");
  });

  it("returns locale date for >=1 week", () => {
    const old = formatRelTime(Date.now() - 30 * 24 * 60 * 60_000);
    expect(old).toMatch(/\d/); // some date string
    expect(old).not.toContain("ago");
  });
});
