import { describe, expect, it } from "vitest";
import type { Block } from "@/shared/types/domain";
import {
  moveTopLevelGroup,
  placeTopLevelGroupAtBlock,
  appendTopLevelGroupToContainer,
  topLevelIdsInOrder,
} from "./multiMove";

const para = (id: string): Block => ({ id, type: "paragraph", text: id });
const blocks = (...ids: string[]): Block[] => ids.map(para);

describe("multiMove", () => {
  it("topLevelIdsInOrder filters + sorts", () => {
    const bs = blocks("a", "b", "c", "d");
    expect(topLevelIdsInOrder(bs, ["c", "a"])).toEqual(["a", "c"]);
    expect(topLevelIdsInOrder(bs, ["x"])).toEqual([]);
  });

  it("moveTopLevelGroup up moves group above predecessor", () => {
    const bs = blocks("A", "B", "C", "D", "E");
    const out = moveTopLevelGroup(bs, ["C", "E"], -1);
    expect(out.map((b) => b.id)).toEqual(["A", "C", "E", "B", "D"]);
  });

  it("moveTopLevelGroup down inserts group after the next block", () => {
    const bs = blocks("A", "B", "C", "D", "E");
    const out = moveTopLevelGroup(bs, ["B", "D"], 1);
    // remaining = [A,C,E]; minIdx_pre = 1; newAnchor = 2 → [A,C,B,D,E]
    expect(out.map((b) => b.id)).toEqual(["A", "C", "B", "D", "E"]);
  });

  it("moveTopLevelGroup down is a no-op when the bottommost selected is last", () => {
    const bs = blocks("A", "B", "C", "D", "E");
    expect(moveTopLevelGroup(bs, ["C", "E"], 1)).toBe(bs);
  });

  it("moveTopLevelGroup up at boundary is a no-op", () => {
    const bs = blocks("A", "B");
    expect(moveTopLevelGroup(bs, ["A"], -1)).toBe(bs);
  });

  it("moveTopLevelGroup down at boundary is a no-op", () => {
    const bs = blocks("A", "B");
    expect(moveTopLevelGroup(bs, ["B"], 1)).toBe(bs);
  });

  it("placeTopLevelGroupAtBlock inserts at over position", () => {
    const bs = blocks("A", "B", "C", "D", "E");
    const out = placeTopLevelGroupAtBlock(bs, ["B", "D"], "A");
    // remaining = [A,C,E]; overIdx = 0 → [B,D,A,C,E]
    expect(out.map((b) => b.id)).toEqual(["B", "D", "A", "C", "E"]);
  });

  it("placeTopLevelGroupAtBlock no-op when over is in selection", () => {
    const bs = blocks("A", "B", "C");
    expect(placeTopLevelGroupAtBlock(bs, ["A", "B"], "A")).toBe(bs);
  });

  it("appendTopLevelGroupToContainer toggle pushes children", () => {
    const bs: Block[] = [
      para("A"),
      { id: "T", type: "toggle", text: "t", children: [para("X")], collapsed: true },
      para("B"),
      para("C"),
    ];
    const out = appendTopLevelGroupToContainer(bs, ["A", "C"], "T", "toggle");
    expect(out.map((b) => b.id)).toEqual(["T", "B"]);
    const t = out[0] as Block;
    expect(t.children?.map((c) => c.id)).toEqual(["X", "A", "C"]);
    expect(t.collapsed).toBe(false);
  });

  it("appendTopLevelGroupToContainer column pushes into specified pane", () => {
    const bs: Block[] = [
      para("A"),
      { id: "K", type: "columns2", text: "", columns: [[para("L1")], [para("R1")]] },
      para("B"),
    ];
    const out = appendTopLevelGroupToContainer(bs, ["A", "B"], "K", "column", 1);
    expect(out.map((b) => b.id)).toEqual(["K"]);
    const k = out[0] as Block;
    expect(k.columns?.[0].map((c) => c.id)).toEqual(["L1"]);
    expect(k.columns?.[1].map((c) => c.id)).toEqual(["R1", "A", "B"]);
  });

  it("appendTopLevelGroupToContainer no-op when target is in selection", () => {
    const bs: Block[] = [
      { id: "T", type: "toggle", text: "t", children: [], collapsed: false },
      para("A"),
    ];
    expect(appendTopLevelGroupToContainer(bs, ["T"], "T", "toggle")).toBe(bs);
  });
});
