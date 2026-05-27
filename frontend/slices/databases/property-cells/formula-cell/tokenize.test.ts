import { describe, expect, it } from "vitest";
import { getTokenAt, propNeedsClose } from "./tokenize";

describe("tokenize — getTokenAt", () => {
  it("returns null on empty input", () => {
    expect(getTokenAt("", 0)).toEqual({ kind: null, start: 0, prefix: "" });
  });

  it("detects fn ident at caret", () => {
    // caret at end of "con"
    expect(getTokenAt("con", 3)).toEqual({ kind: "fn", start: 0, prefix: "con" });
  });

  it("does NOT suggest fn when caret already at `(`", () => {
    expect(getTokenAt("concat(", 6)).toEqual({ kind: null, start: 6, prefix: "" });
  });

  it("detects prop ref inside unclosed `{{`", () => {
    expect(getTokenAt("Hi {{ti", 7)).toEqual({ kind: "prop", start: 5, prefix: "ti" });
  });

  it("ignores closed `{{...}}` — empty after close", () => {
    // `{{name}} ` then caret at end
    expect(getTokenAt("{{name}} ", 9).kind).toBe(null);
  });

  it("re-opens after second `{{` past a closed one", () => {
    expect(getTokenAt("{{a}} {{b", 9)).toEqual({ kind: "prop", start: 8, prefix: "b" });
  });

  it("suppresses fn inside string literal", () => {
    // caret inside "..." string
    expect(getTokenAt(`concat("ab`, 10)).toEqual({ kind: null, start: 10, prefix: "" });
  });

  it("allows fn after a closed string", () => {
    // `concat("a"), lo` → caret at end suggests `lo`
    expect(getTokenAt(`concat("a"), lo`, 15)).toEqual({ kind: "fn", start: 13, prefix: "lo" });
  });
});

describe("tokenize — propNeedsClose", () => {
  it("needs close when EOL has no `}}`", () => {
    expect(propNeedsClose("{{ti", 4)).toBe(true);
  });

  it("does NOT need close when `}}` already follows", () => {
    expect(propNeedsClose("{{ti}}", 4)).toBe(false);
  });

  it("needs close when another `{{` opens before next `}}`", () => {
    expect(propNeedsClose("{{a {{b}}", 4)).toBe(true);
  });
});
