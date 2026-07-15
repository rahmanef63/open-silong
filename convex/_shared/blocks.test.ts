import { describe, expect, it } from "vitest";
import {
  regenBlockIdsDeep,
  regenAllBlockIds,
  walkBlocks,
  findDuplicateBlockId,
  type BlockLike,
} from "./blocks";

describe("regenBlockIdsDeep", () => {
  it("regenerates a leaf block's id", () => {
    const src: BlockLike = { id: "a", text: "hi" };
    const next = regenBlockIdsDeep(src);
    expect(next.id).not.toBe("a");
    expect(next.text).toBe("hi");
  });

  it("regenerates ids inside children recursively", () => {
    const src: BlockLike = {
      id: "root",
      children: [{ id: "c1" }, { id: "c2", children: [{ id: "c2a" }] }],
    };
    const next = regenBlockIdsDeep(src);
    expect(next.id).not.toBe("root");
    expect(next.children?.[0].id).not.toBe("c1");
    expect(next.children?.[1].id).not.toBe("c2");
    expect(next.children?.[1].children?.[0].id).not.toBe("c2a");
  });

  it("regenerates ids inside columns", () => {
    const src: BlockLike = {
      id: "cols",
      columns: [
        [{ id: "p1" }, { id: "p2" }],
        [{ id: "p3" }],
      ],
    };
    const next = regenBlockIdsDeep(src);
    const ids = [
      next.id,
      ...(next.columns?.[0].map((b) => b.id) ?? []),
      ...(next.columns?.[1].map((b) => b.id) ?? []),
    ];
    expect(ids).not.toContain("cols");
    expect(ids).not.toContain("p1");
    expect(ids).not.toContain("p3");
    // every id unique
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preserves structural fields (text, type, children shape)", () => {
    const src: BlockLike = {
      id: "x",
      text: "body",
      children: [{ id: "c", text: "nested" }],
    };
    const next = regenBlockIdsDeep(src);
    expect(next.text).toBe("body");
    expect(next.children?.length).toBe(1);
    expect(next.children?.[0].text).toBe("nested");
  });
});

describe("regenAllBlockIds", () => {
  it("produces unique ids across an array of blocks with nested trees", () => {
    const blocks: BlockLike[] = [
      { id: "a", children: [{ id: "a1" }, { id: "a2" }] },
      { id: "b", columns: [[{ id: "b1" }], [{ id: "b2" }]] },
    ];
    const next = regenAllBlockIds(blocks);
    const collected: string[] = [];
    walkBlocks(next, (b) => { if (b.id) collected.push(b.id); });
    expect(new Set(collected).size).toBe(collected.length);
    // No id from source survives
    for (const oldId of ["a", "a1", "a2", "b", "b1", "b2"]) {
      expect(collected).not.toContain(oldId);
    }
  });
});

describe("walkBlocks", () => {
  it("visits every reachable block via children + columns", () => {
    const blocks: BlockLike[] = [
      { id: "a", children: [{ id: "a1" }] },
      { id: "b", columns: [[{ id: "b1" }, { id: "b2" }]] },
    ];
    const seen: string[] = [];
    walkBlocks(blocks, (b) => { if (b.id) seen.push(b.id); });
    expect(seen.sort()).toEqual(["a", "a1", "b", "b1", "b2"]);
  });

  it("does not blow stack on deep nesting (iterative)", () => {
    let cur: BlockLike = { id: "leaf" };
    for (let i = 0; i < 1_000; i++) cur = { id: `n${i}`, children: [cur] };
    let count = 0;
    walkBlocks([cur], () => { count++; });
    expect(count).toBe(1_001);
  });
});

describe("findDuplicateBlockId", () => {
  it("returns null when ids are unique", () => {
    expect(findDuplicateBlockId([{ id: "a" }, { id: "b" }])).toBeNull();
  });

  it("flags a top-level duplicate", () => {
    expect(findDuplicateBlockId([{ id: "a" }, { id: "a" }])).toBe("a");
  });

  it("flags a duplicate buried in a child tree", () => {
    expect(findDuplicateBlockId([
      { id: "a", children: [{ id: "x" }] },
      { id: "b", columns: [[{ id: "x" }]] },
    ])).toBe("x");
  });
});
