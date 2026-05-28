import { describe, expect, it } from "vitest";
import type { Block, ColumnLayout, Page } from "@/shared/types/domain";
import {
  isLegacyColumnsBlock, hasLegacyColumns, adaptPageLayouts, groupBlocksIntoChunks,
} from "./layoutAdapter";

const blk = (o: Record<string, unknown> & { type: string }): Block => o as unknown as Block;
const page = (o: Partial<Page>): Page => ({
  id: "p", parentId: null, title: "", icon: "", blocks: [],
  favorite: false, trashed: false, createdAt: 0, updatedAt: 0, ...o,
});

describe("layoutAdapter — legacy detection", () => {
  it("isLegacyColumnsBlock true for columns2..5 only", () => {
    for (const t of ["columns2", "columns3", "columns4", "columns5"]) {
      expect(isLegacyColumnsBlock(blk({ type: t }))).toBe(true);
    }
    expect(isLegacyColumnsBlock(blk({ type: "paragraph" }))).toBe(false);
  });
  it("hasLegacyColumns scans page blocks", () => {
    expect(hasLegacyColumns(page({ blocks: [blk({ type: "paragraph" })] }))).toBe(false);
    expect(hasLegacyColumns(page({ blocks: [blk({ type: "columns3" })] }))).toBe(true);
  });
});

describe("layoutAdapter — adaptPageLayouts", () => {
  it("returns the SAME page object when no legacy columns", () => {
    const p = page({ blocks: [blk({ id: "a", type: "paragraph" })] });
    expect(adaptPageLayouts(p)).toBe(p); // identity — no clone
  });

  it("expands a legacy columns2 into layout + flattened blocks", () => {
    const p = page({
      blocks: [blk({
        id: "col", type: "columns2",
        columns: [[blk({ id: "x", type: "paragraph", text: "L" })], [blk({ id: "y", type: "paragraph", text: "R" })]],
      })],
    });
    const out = adaptPageLayouts(p);
    expect(out).not.toBe(p); // cloned
    expect(out.layouts).toEqual([{ id: "col", type: "columns", count: 2, widths: undefined }]);
    expect(out.blocks.map((b) => [b.id, b.layoutGroup, b.layoutCol])).toEqual([
      ["x", "col", 0],
      ["y", "col", 1],
    ]);
  });

  it("count derives from type (columns3 → 3 columns)", () => {
    const p = page({ blocks: [blk({ id: "c", type: "columns3", columns: [[], [], []] })] });
    const out = adaptPageLayouts(p);
    expect(out.layouts?.[0].count).toBe(3);
  });

  it("seeds an empty paragraph for empty columns", () => {
    const p = page({ blocks: [blk({ id: "c", type: "columns2", columns: [[], []] })] });
    const out = adaptPageLayouts(p);
    // 2 columns, each empty → 2 seeded paragraphs
    expect(out.blocks).toHaveLength(2);
    expect(out.blocks.every((b) => b.type === "paragraph" && b.text === "")).toBe(true);
    expect(out.blocks.map((b) => b.layoutCol)).toEqual([0, 1]);
  });

  it("preserves pre-existing layouts + interleaves non-legacy blocks", () => {
    const existing: ColumnLayout = { id: "L0", type: "columns", count: 2 };
    const p = page({
      layouts: [existing],
      blocks: [
        blk({ id: "p1", type: "paragraph", text: "top" }),
        blk({ id: "c", type: "columns2", columns: [[blk({ id: "x", type: "paragraph" })], [blk({ id: "y", type: "paragraph" })]] }),
      ],
    });
    const out = adaptPageLayouts(p);
    expect(out.layouts?.[0]).toEqual(existing); // kept
    expect(out.layouts).toHaveLength(2);
    expect(out.blocks[0].id).toBe("p1"); // standalone passes through
  });

  it("does not mutate the input page", () => {
    const p = page({ blocks: [blk({ id: "c", type: "columns2", columns: [[], []] })] });
    const before = p.blocks.length;
    adaptPageLayouts(p);
    expect(p.blocks).toHaveLength(before);
    expect(p.layouts).toBeUndefined();
  });
});

describe("layoutAdapter — groupBlocksIntoChunks", () => {
  it("no layouts → all block chunks with original index", () => {
    const blocks = [blk({ id: "a", type: "paragraph" }), blk({ id: "b", type: "paragraph" })];
    const chunks = groupBlocksIntoChunks(blocks, undefined);
    expect(chunks).toEqual([
      { kind: "block", block: blocks[0], index: 0 },
      { kind: "block", block: blocks[1], index: 1 },
    ]);
  });

  it("groups layoutGroup blocks into a layout chunk with columns", () => {
    const layouts: ColumnLayout[] = [{ id: "L", type: "columns", count: 2 }];
    const blocks = [
      blk({ id: "x", type: "paragraph", layoutGroup: "L", layoutCol: 0 }),
      blk({ id: "y", type: "paragraph", layoutGroup: "L", layoutCol: 1 }),
    ];
    const chunks = groupBlocksIntoChunks(blocks, layouts);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].kind).toBe("layout");
    const lc = chunks[0] as Extract<typeof chunks[number], { kind: "layout" }>;
    expect(lc.columns[0].map((b) => b.id)).toEqual(["x"]);
    expect(lc.columns[1].map((b) => b.id)).toEqual(["y"]);
  });

  it("clamps out-of-range layoutCol into the last column", () => {
    const layouts: ColumnLayout[] = [{ id: "L", type: "columns", count: 2 }];
    const blocks = [blk({ id: "x", type: "paragraph", layoutGroup: "L", layoutCol: 9 })];
    const chunks = groupBlocksIntoChunks(blocks, layouts);
    const lc = chunks[0] as Extract<typeof chunks[number], { kind: "layout" }>;
    expect(lc.columns[1].map((b) => b.id)).toEqual(["x"]); // clamped to col 1
  });

  it("interleaves standalone block → layout → standalone block", () => {
    const layouts: ColumnLayout[] = [{ id: "L", type: "columns", count: 2 }];
    const blocks = [
      blk({ id: "top", type: "paragraph" }),
      blk({ id: "x", type: "paragraph", layoutGroup: "L", layoutCol: 0 }),
      blk({ id: "bot", type: "paragraph" }),
    ];
    const chunks = groupBlocksIntoChunks(blocks, layouts);
    expect(chunks.map((c) => c.kind)).toEqual(["block", "layout", "block"]);
  });

  it("block referencing an unknown layoutGroup is treated as standalone", () => {
    const blocks = [blk({ id: "x", type: "paragraph", layoutGroup: "ghost", layoutCol: 0 })];
    const chunks = groupBlocksIntoChunks(blocks, [{ id: "L", type: "columns", count: 2 }]);
    expect(chunks).toEqual([{ kind: "block", block: blocks[0], index: 0 }]);
  });

  it("pads columns up to layout.count when a column has no blocks", () => {
    const layouts: ColumnLayout[] = [{ id: "L", type: "columns", count: 3 }];
    const blocks = [blk({ id: "x", type: "paragraph", layoutGroup: "L", layoutCol: 0 })];
    const chunks = groupBlocksIntoChunks(blocks, layouts);
    const lc = chunks[0] as Extract<typeof chunks[number], { kind: "layout" }>;
    expect(lc.columns).toHaveLength(3);
    expect(lc.columns[1]).toEqual([]);
    expect(lc.columns[2]).toEqual([]);
  });
});
