import { describe, expect, it } from "vitest";
import {
  addBlockToArray, replaceBlockInArray, duplicateBlockInArray,
  insertBlocksAfterAnchor, updateBlockInArray, deleteBlockFromArray,
  reorderBlocksInArray, type BlockLike,
} from "./blockOps";

let counter = 0;
const uid = () => `gen${counter++}`;
const reset = () => { counter = 0; };

const b = (id: string, extra: Partial<BlockLike> = {}): BlockLike => ({ id, type: "paragraph", text: id, ...extra });

describe("blockOps — addBlockToArray", () => {
  it("inserts after the given index with a fresh id", () => {
    reset();
    const { blocks, newId } = addBlockToArray([b("a"), b("c")], 0, "bullet", { text: "x" }, uid);
    expect(newId).toBe("gen0");
    expect(blocks.map((x) => x.id)).toEqual(["a", "gen0", "c"]);
    expect(blocks[1]).toMatchObject({ type: "bullet", text: "x" });
  });
  it("defaults type to paragraph + todo gets checked:false", () => {
    reset();
    const { blocks } = addBlockToArray([], -1, "todo", undefined, uid);
    expect(blocks[0]).toMatchObject({ type: "todo", checked: false });
  });
  it("does not mutate the input array", () => {
    reset();
    const input = [b("a")];
    addBlockToArray(input, 0, undefined, undefined, uid);
    expect(input).toHaveLength(1);
  });
});

describe("blockOps — replaceBlockInArray", () => {
  it("replaces by id, preserving the id", () => {
    const out = replaceBlockInArray([b("a"), b("b")], "b", { type: "quote", text: "new" });
    expect(out).not.toBeNull();
    expect(out![1]).toEqual({ id: "b", type: "quote", text: "new" });
  });
  it("returns null when id not found", () => {
    expect(replaceBlockInArray([b("a")], "zzz", {})).toBeNull();
  });
});

describe("blockOps — duplicateBlockInArray", () => {
  it("clones with fresh id immediately after", () => {
    reset();
    const dup = duplicateBlockInArray([b("a"), b("b")], "a", uid);
    expect(dup).not.toBeNull();
    expect(dup!.newId).toBe("gen0");
    expect(dup!.blocks.map((x) => x.id)).toEqual(["a", "gen0", "b"]);
    expect(dup!.blocks[1].text).toBe("a"); // cloned content
  });
  it("returns null when id not found", () => {
    expect(duplicateBlockInArray([b("a")], "zzz", uid)).toBeNull();
  });
});

describe("blockOps — insertBlocksAfterAnchor", () => {
  it("splices incoming after the anchor", () => {
    const out = insertBlocksAfterAnchor([b("a"), b("c")], "a", [b("x"), b("y")], false);
    expect(out!.map((x) => x.id)).toEqual(["a", "x", "y", "c"]);
  });
  it("replaceAnchor swaps the anchor for the incoming", () => {
    const out = insertBlocksAfterAnchor([b("a"), b("c")], "a", [b("x")], true);
    expect(out!.map((x) => x.id)).toEqual(["x", "c"]);
  });
  it("incoming inherits anchor layout stamps when absent", () => {
    const anchor = b("a", { layoutGroup: "g1", layoutCol: 2 });
    const out = insertBlocksAfterAnchor([anchor], "a", [b("x")], false);
    expect(out![1]).toMatchObject({ layoutGroup: "g1", layoutCol: 2 });
  });
  it("incoming keeps its own layout stamps over the anchor's", () => {
    const anchor = b("a", { layoutGroup: "g1", layoutCol: 2 });
    const out = insertBlocksAfterAnchor([anchor], "a", [b("x", { layoutGroup: "own", layoutCol: 9 })], false);
    expect(out![1]).toMatchObject({ layoutGroup: "own", layoutCol: 9 });
  });
  it("returns null when anchor not found", () => {
    expect(insertBlocksAfterAnchor([b("a")], "zzz", [b("x")], false)).toBeNull();
  });
});

describe("blockOps — updateBlockInArray", () => {
  it("merges patch into the matching block", () => {
    const out = updateBlockInArray([b("a"), b("b")], "b", { text: "patched", color: "red" });
    expect(out[1]).toMatchObject({ id: "b", text: "patched", color: "red" });
    expect(out[0]).toEqual(b("a")); // untouched
  });
  it("no-op (same content) when id absent", () => {
    const input = [b("a")];
    const out = updateBlockInArray(input, "zzz", { text: "x" });
    expect(out).toEqual(input);
  });
});

describe("blockOps — deleteBlockFromArray", () => {
  it("removes the matching block", () => {
    const out = deleteBlockFromArray([b("a"), b("b")], "a", uid);
    expect(out.map((x) => x.id)).toEqual(["b"]);
  });
  it("seeds an empty paragraph when emptied", () => {
    reset();
    const out = deleteBlockFromArray([b("only")], "only", uid);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: "paragraph", text: "" });
  });
});

describe("blockOps — reorderBlocksInArray", () => {
  it("reorders to match orderedIds", () => {
    const out = reorderBlocksInArray([b("a"), b("b"), b("c")], ["c", "a", "b"]);
    expect(out.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
  it("drops ids not present in the source set", () => {
    const out = reorderBlocksInArray([b("a"), b("b")], ["b", "ghost", "a"]);
    expect(out.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
