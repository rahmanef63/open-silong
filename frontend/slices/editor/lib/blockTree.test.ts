import { describe, it, expect } from "vitest";
import type { Block } from "@/shared/types/domain";
import { findLocation, moveBlock, removeAt, insertAt, type Location } from "./blockTree";

const para = (id: string, text = ""): Block => ({ id, type: "paragraph", text });
const toggle = (id: string, children: Block[]): Block => ({
  id, type: "toggle", text: "", children, collapsed: false,
});
const cols2 = (id: string, c0: Block[], c1: Block[]): Block => ({
  id, type: "columns2", text: "", columns: [c0, c1],
});

describe("findLocation", () => {
  const blocks: Block[] = [
    para("a"), para("b"),
    toggle("T", [para("t1"), para("t2")]),
    cols2("C", [para("c00"), para("c01")], [para("c10")]),
  ];

  it("finds top-level", () => {
    expect(findLocation(blocks, "a")).toEqual({ kind: "top", index: 0 });
    expect(findLocation(blocks, "T")).toEqual({ kind: "top", index: 2 });
  });

  it("finds toggle child", () => {
    expect(findLocation(blocks, "t2")).toEqual({ kind: "toggle", containerId: "T", index: 1 });
  });

  it("finds column child", () => {
    expect(findLocation(blocks, "c01")).toEqual({ kind: "col", containerId: "C", colIndex: 0, index: 1 });
    expect(findLocation(blocks, "c10")).toEqual({ kind: "col", containerId: "C", colIndex: 1, index: 0 });
  });

  it("returns null for missing", () => {
    expect(findLocation(blocks, "zzz")).toBeNull();
  });
});

describe("moveBlock — top-level reorder", () => {
  it("moves A from 0 → 1 (adjacent down)", () => {
    const blocks = [para("a"), para("b"), para("c")];
    const next = moveBlock(blocks, { kind: "top", index: 0 }, { kind: "top", index: 1 });
    expect(next.map((b) => b.id)).toEqual(["b", "a", "c"]);
  });
  it("moves C from 2 → 0", () => {
    const blocks = [para("a"), para("b"), para("c")];
    const next = moveBlock(blocks, { kind: "top", index: 2 }, { kind: "top", index: 0 });
    expect(next.map((b) => b.id)).toEqual(["c", "a", "b"]);
  });
  it("moves A from 0 → 2 (last)", () => {
    const blocks = [para("a"), para("b"), para("c")];
    const next = moveBlock(blocks, { kind: "top", index: 0 }, { kind: "top", index: 2 });
    expect(next.map((b) => b.id)).toEqual(["b", "c", "a"]);
  });
});

describe("moveBlock — into toggle", () => {
  it("moves top-level into empty toggle", () => {
    const blocks: Block[] = [para("a"), toggle("T", [])];
    const from = findLocation(blocks, "a")!;
    const to: Location = { kind: "toggle", containerId: "T", index: 0 };
    const next = moveBlock(blocks, from, to);
    expect(next.length).toBe(1);
    expect(next[0].id).toBe("T");
    expect(next[0].children?.map((c) => c.id)).toEqual(["a"]);
  });
  it("appends to non-empty toggle", () => {
    const blocks: Block[] = [para("a"), toggle("T", [para("t1")])];
    const from = findLocation(blocks, "a")!;
    const to: Location = { kind: "toggle", containerId: "T", index: 1 };
    const next = moveBlock(blocks, from, to);
    expect(next[0].children?.map((c) => c.id)).toEqual(["t1", "a"]);
  });
});

describe("moveBlock — out of toggle to top", () => {
  it("drags toggle child to top-level position", () => {
    const blocks: Block[] = [para("a"), toggle("T", [para("t1"), para("t2")]), para("b")];
    const from = findLocation(blocks, "t1")!;
    const to: Location = { kind: "top", index: 2 };
    const next = moveBlock(blocks, from, to);
    expect(next.map((b) => b.id)).toEqual(["a", "T", "t1", "b"]);
    const T = next.find((b) => b.id === "T")!;
    expect(T.children?.map((c) => c.id)).toEqual(["t2"]);
  });
});

describe("moveBlock — within column", () => {
  it("reorders within same column", () => {
    const blocks: Block[] = [cols2("C", [para("x"), para("y"), para("z")], [])];
    const from = findLocation(blocks, "x")!;
    const to = findLocation(blocks, "z")!;
    const next = moveBlock(blocks, from, to);
    expect(next[0].columns?.[0].map((b) => b.id)).toEqual(["y", "z", "x"]);
  });
  it("between columns", () => {
    const blocks: Block[] = [cols2("C", [para("x"), para("y")], [para("z")])];
    const from = findLocation(blocks, "x")!;
    const to: Location = { kind: "col", containerId: "C", colIndex: 1, index: 1 };
    const next = moveBlock(blocks, from, to);
    expect(next[0].columns?.[0].map((b) => b.id)).toEqual(["y"]);
    expect(next[0].columns?.[1].map((b) => b.id)).toEqual(["z", "x"]);
  });
});

describe("moveBlock — between toggles", () => {
  it("moves child from toggle A to toggle B", () => {
    const blocks: Block[] = [
      toggle("A", [para("a1"), para("a2")]),
      toggle("B", [para("b1")]),
    ];
    const from = findLocation(blocks, "a1")!;
    const to: Location = { kind: "toggle", containerId: "B", index: 1 };
    const next = moveBlock(blocks, from, to);
    expect(next[0].children?.map((c) => c.id)).toEqual(["a2"]);
    expect(next[1].children?.map((c) => c.id)).toEqual(["b1", "a1"]);
  });
});

describe("removeAt + insertAt round-trip", () => {
  it("re-inserting at same loc is identity", () => {
    const blocks: Block[] = [para("a"), toggle("T", [para("t1")])];
    const loc = findLocation(blocks, "t1")!;
    const { removed, blocks: after } = removeAt(blocks, loc);
    const back = insertAt(after, loc, removed);
    expect(back).toEqual(blocks);
  });
});
