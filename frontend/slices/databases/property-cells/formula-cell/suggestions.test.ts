import { describe, expect, it } from "vitest";
import type { Database } from "@/shared/types/domain";
import { buildSuggestions } from "./suggestions";
import { getTokenAt } from "./tokenize";

const mkDb = (overrides: Partial<Database> = {}): Database => ({
  id: "db",
  name: "Test",
  icon: "📁",
  properties: [],
  rowIds: [],
  views: [],
  activeViewId: "",
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

/** Wire token → suggestions in one shot (mirrors editor runtime). */
function suggest(text: string, caret: number, db: Database) {
  return buildSuggestions(getTokenAt(text, caret), text, caret, db);
}

describe("suggestions — prop completion (inside `{{...}}`)", () => {
  it("suggests `title` built-in first, then matching properties", () => {
    const db = mkDb({ properties: [{ id: "s", name: "Status", type: "text" }] });
    const out = suggest("{{t", 3, db);
    const labels = out.map((s) => s.label);
    expect(labels).toContain("title");
  });

  it("matches case-insensitively", () => {
    const db = mkDb({ properties: [{ id: "s", name: "Status", type: "text" }] });
    const out = suggest("{{stat", 6, db);
    expect(out.map((s) => s.label)).toContain("Status");
  });

  it("includes `}}` close when none follows", () => {
    const db = mkDb({ properties: [{ id: "s", name: "Status", type: "text" }] });
    const out = suggest("{{stat", 6, db);
    expect(out.find((s) => s.label === "Status")?.insert).toBe("Status}}");
  });

  it("omits `}}` close when one already follows", () => {
    const db = mkDb({ properties: [{ id: "s", name: "Status", type: "text" }] });
    const out = suggest("{{stat}}", 6, db);
    expect(out.find((s) => s.label === "Status")?.insert).toBe("Status");
  });
});

describe("suggestions — fn completion (bare ident)", () => {
  it("suggests fn names with sig detail line", () => {
    const out = suggest("conc", 4, mkDb());
    const concat = out.find((s) => s.label === "concat");
    expect(concat).toBeTruthy();
    expect(concat?.insert).toBe("concat()");
    expect(concat?.caretOffset).toBe(-1);
    expect(concat?.detail).toMatch(/→ string/);
  });

  it("prop() uses the `prop(\"\")` template — caret between quotes", () => {
    const out = suggest("pro", 3, mkDb());
    const prop = out.find((s) => s.label === "prop");
    expect(prop).toBeTruthy();
    expect(prop?.insert).toBe(`prop("")`);
    expect(prop?.caretOffset).toBe(-2);
  });

  it("no fn matches → empty list", () => {
    const out = suggest("zzz", 3, mkDb());
    expect(out).toEqual([]);
  });
});

describe("suggestions — lambda vars inside higher-order body (1.D.4)", () => {
  it("inside map(...) — `cur` suggests `current` BEFORE fn names", () => {
    // `map(prop("X"), cur|)`  — caret at end of `cur`
    const src = `map(prop("X"), cur`;
    const out = suggest(src, src.length, mkDb());
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].label).toBe("current");
    expect(out[0].detail).toMatch(/lambda var.*map/);
  });

  it("inside reduce(...) — `acc` suggests `accumulator`", () => {
    const src = `reduce(prop("X"), acc`;
    const out = suggest(src, src.length, mkDb());
    expect(out[0].label).toBe("accumulator");
    expect(out[0].detail).toMatch(/lambda var.*reduce/);
  });

  it("inside filter(...) — `ind` suggests `index`", () => {
    const src = `filter(prop("X"), ind`;
    const out = suggest(src, src.length, mkDb());
    expect(out[0].label).toBe("index");
  });

  it("outside any higher-order call — no lambda vars suggested", () => {
    // bare `cur` at top level — no fn matches `cur` either → empty
    const out = suggest(`cur`, 3, mkDb());
    expect(out.find((s) => s.label === "current")).toBeUndefined();
  });

  it("inside non-higher-order call (e.g. concat) — no lambda vars", () => {
    const src = `concat(cur`;
    const out = suggest(src, src.length, mkDb());
    expect(out.find((s) => s.label === "current")).toBeUndefined();
  });

  it("reduce — `c` suggests `current` (not `accumulator`)", () => {
    const src = `reduce(prop("X"), c`;
    const out = suggest(src, src.length, mkDb());
    expect(out[0].label).toBe("current");
  });
});

describe("suggestions — no kind", () => {
  it("returns empty when not in a recognised token", () => {
    expect(suggest("1 + 2 ", 6, mkDb())).toEqual([]);
  });
});
