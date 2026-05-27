import { describe, expect, it } from "vitest";
import { findEnclosingCall } from "./enclosingCall";

describe("enclosingCall", () => {
  it("returns null at top level", () => {
    expect(findEnclosingCall("", 0)).toBeNull();
    expect(findEnclosingCall("1 + 2", 5)).toBeNull();
  });

  it("identifies fn name + arg 0 inside call", () => {
    expect(findEnclosingCall("concat(", 7)).toEqual({
      fnName: "concat", argIndex: 0, openPos: 6,
    });
  });

  it("counts commas → arg index", () => {
    // caret after second comma → arg index 2
    expect(findEnclosingCall("if(a, b, ", 9)?.argIndex).toBe(2);
  });

  it("ignores commas inside strings", () => {
    expect(findEnclosingCall(`replace("a,b,c", "`, 18)?.argIndex).toBe(1);
  });

  it("handles nested calls — returns innermost", () => {
    // outer if(...), inner concat at caret
    expect(findEnclosingCall(`if(true, concat("a", `, 21)).toEqual({
      fnName: "concat", argIndex: 1, openPos: 15,
    });
  });

  it("ignores bare paren groups", () => {
    // `((` then caret — no fn name preceded the parens
    expect(findEnclosingCall("((", 2)).toBeNull();
  });

  it("pops on `)` — returns null after call closes", () => {
    expect(findEnclosingCall("concat()", 8)).toBeNull();
  });

  it("respects escaped quote in string", () => {
    // `"a\\"b,"` — the comma is inside the string (after escaped quote)
    expect(findEnclosingCall(`f("a\\"b,", `, 11)?.argIndex).toBe(1);
  });
});
