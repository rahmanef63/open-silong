import { describe, it, expect } from "vitest";
import { mentionDeleteRange } from "./mentionDelete";

describe("mentionDeleteRange", () => {
  it("selects the whole page mention when the caret is right after it", () => {
    const t = "hi [Notes](/dashboard/p/abc123)";
    expect(mentionDeleteRange(t, t.length)).toEqual([3, t.length]);
  });
  it("handles db mentions", () => {
    const t = "[Tasks](/dashboard/db/xy_9)";
    expect(mentionDeleteRange(t, t.length)).toEqual([0, t.length]);
  });
  it("handles the legacy bare /p/ shape", () => {
    const t = "see [X](/p/id42)";
    expect(mentionDeleteRange(t, t.length)).toEqual([4, t.length]);
  });
  it("fires only when the caret is right after the ')'", () => {
    const t = "[N](/dashboard/p/a1) x"; // ')' at index 19, caret 20
    expect(mentionDeleteRange(t, 20)).toEqual([0, 20]);
    expect(mentionDeleteRange(t, t.length)).toBeNull(); // caret after " x"
  });
  it("no-ops on plain text / empty / out-of-range", () => {
    expect(mentionDeleteRange("plain text", 5)).toBeNull();
    expect(mentionDeleteRange("", 0)).toBeNull();
    expect(mentionDeleteRange("[N](/p/a1)", 99)).toBeNull();
    expect(mentionDeleteRange("(paren)", 7)).toBeNull();
  });
});
