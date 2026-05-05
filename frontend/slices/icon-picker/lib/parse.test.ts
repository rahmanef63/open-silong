import { describe, expect, it } from "vitest";
import { parseIconValue, lucideValue, withColor, isLucideValue, LUCIDE_PREFIX } from "./parse";

describe("parseIconValue", () => {
  it("returns empty for null/undefined/empty", () => {
    expect(parseIconValue(null)).toEqual({ kind: "empty" });
    expect(parseIconValue(undefined)).toEqual({ kind: "empty" });
    expect(parseIconValue("")).toEqual({ kind: "empty" });
  });

  it("parses raw emoji", () => {
    expect(parseIconValue("🎯")).toEqual({ kind: "emoji", emoji: "🎯", color: undefined });
  });

  it("parses lucide value with no color", () => {
    expect(parseIconValue("lucide:Star")).toEqual({ kind: "lucide", name: "Star", color: undefined });
  });

  it("parses lucide value with color suffix", () => {
    expect(parseIconValue("lucide:Star?c=f59e0b")).toEqual({
      kind: "lucide", name: "Star", color: "#f59e0b",
    });
  });

  it("parses emoji + color suffix", () => {
    expect(parseIconValue("🎯?c=ff0000")).toEqual({ kind: "emoji", emoji: "🎯", color: "#ff0000" });
  });

  it("normalises hex case + strips leading #", () => {
    expect(parseIconValue("lucide:Star?c=#ABCDEF")?.color).toBe("#abcdef");
  });

  it("rejects invalid hex (not 3-8 chars)", () => {
    expect(parseIconValue("lucide:Star?c=zz")?.color).toBeUndefined();
    expect(parseIconValue("lucide:Star?c=12345g")?.color).toBeUndefined();
  });

  it("returns empty for bare lucide: prefix with no name", () => {
    expect(parseIconValue("lucide:")).toEqual({ kind: "empty" });
    expect(parseIconValue("lucide:   ")).toEqual({ kind: "empty" });
  });

  it("ignores unknown query params", () => {
    expect(parseIconValue("lucide:Star?foo=bar&c=ff0000")?.color).toBe("#ff0000");
  });
});

describe("lucideValue + withColor", () => {
  it("builds canonical lucide string", () => {
    expect(lucideValue("Star")).toBe("lucide:Star");
    expect(lucideValue("Star", "#f59e0b")).toBe("lucide:Star?c=f59e0b");
  });

  it("withColor strips existing color when none provided", () => {
    expect(withColor("lucide:Star?c=f59e0b")).toBe("lucide:Star");
    expect(withColor("🎯?c=ff0000")).toBe("🎯");
  });

  it("withColor normalises hex case + leading #", () => {
    expect(withColor("lucide:Star", "#ABCDEF")).toBe("lucide:Star?c=abcdef");
  });

  it("withColor on empty string is empty", () => {
    expect(withColor("")).toBe("");
    expect(withColor("", "#fff")).toBe("");
  });

  it("round-trips through parseIconValue", () => {
    const v = lucideValue("BookmarkIcon", "#22c55e");
    const parsed = parseIconValue(v);
    expect(parsed).toEqual({ kind: "lucide", name: "BookmarkIcon", color: "#22c55e" });
  });
});

describe("isLucideValue", () => {
  it("detects lucide prefix", () => {
    expect(isLucideValue("lucide:Star")).toBe(true);
    expect(isLucideValue("lucide:Foo?c=ff0")).toBe(true);
  });
  it("rejects emoji + empty", () => {
    expect(isLucideValue("🎯")).toBe(false);
    expect(isLucideValue(null)).toBe(false);
    expect(isLucideValue("")).toBe(false);
  });
});

describe("LUCIDE_PREFIX export", () => {
  it("matches actual prefix", () => {
    expect(LUCIDE_PREFIX).toBe("lucide:");
  });
});
