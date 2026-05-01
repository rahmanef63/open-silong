import { describe, expect, it } from "vitest";
import {
  emptySelection, selectSingle, toggleSelection, rangeSelect, clearSelection, pruneToOrder,
} from "./selectionState";

describe("selectionState", () => {
  it("selectSingle sets id + anchor", () => {
    const s = selectSingle("a");
    expect([...s.ids]).toEqual(["a"]);
    expect(s.anchor).toBe("a");
  });

  it("toggleSelection adds then removes", () => {
    let s = emptySelection;
    s = toggleSelection(s, "a");
    expect(s.ids.has("a")).toBe(true);
    expect(s.anchor).toBe("a");
    s = toggleSelection(s, "b");
    expect(s.ids.size).toBe(2);
    expect(s.anchor).toBe("b");
    s = toggleSelection(s, "a");
    expect(s.ids.has("a")).toBe(false);
    expect(s.ids.has("b")).toBe(true);
  });

  it("rangeSelect spans anchor → id, inclusive", () => {
    const order = ["a", "b", "c", "d", "e"];
    const s = rangeSelect(selectSingle("b"), "d", order);
    expect([...s.ids].sort()).toEqual(["b", "c", "d"]);
    expect(s.anchor).toBe("b");
  });

  it("rangeSelect handles reverse order", () => {
    const order = ["a", "b", "c", "d", "e"];
    const s = rangeSelect(selectSingle("d"), "a", order);
    expect([...s.ids].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("rangeSelect with no anchor falls back to single", () => {
    const s = rangeSelect(emptySelection, "c", ["a", "b", "c"]);
    expect([...s.ids]).toEqual(["c"]);
    expect(s.anchor).toBe("c");
  });

  it("clearSelection empties state", () => {
    const s = clearSelection();
    expect(s.ids.size).toBe(0);
    expect(s.anchor).toBeNull();
  });

  it("pruneToOrder drops missing ids and anchor", () => {
    const s = { ids: new Set(["a", "b", "x"]), anchor: "x" };
    const out = pruneToOrder(s, ["a", "b", "c"]);
    expect([...out.ids].sort()).toEqual(["a", "b"]);
    expect(out.anchor).toBeNull();
  });

  it("pruneToOrder is idempotent when valid", () => {
    const s = { ids: new Set(["a", "b"]), anchor: "a" };
    const out = pruneToOrder(s, ["a", "b", "c"]);
    expect(out).toBe(s);
  });
});
