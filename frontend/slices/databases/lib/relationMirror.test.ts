import { describe, expect, it } from "vitest";
import { applyMirrorToInverse, planRelationMirror } from "./relationMirror";

describe("planRelationMirror", () => {
  it("flags added ids", () => {
    expect(planRelationMirror({ srcRowId: "s", prior: ["a"], next: ["a", "b"] }))
      .toEqual({ added: ["b"], removed: [] });
  });

  it("flags removed ids", () => {
    expect(planRelationMirror({ srcRowId: "s", prior: ["a", "b"], next: ["a"] }))
      .toEqual({ added: [], removed: ["b"] });
  });

  it("handles full swap", () => {
    expect(planRelationMirror({ srcRowId: "s", prior: ["a"], next: ["b"] }))
      .toEqual({ added: ["b"], removed: ["a"] });
  });

  it("treats null/undefined prior as empty", () => {
    expect(planRelationMirror({ srcRowId: "s", prior: null, next: ["x"] }))
      .toEqual({ added: ["x"], removed: [] });
    expect(planRelationMirror({ srcRowId: "s", prior: undefined, next: ["x"] }))
      .toEqual({ added: ["x"], removed: [] });
  });

  it("treats non-array prior as empty", () => {
    expect(planRelationMirror({ srcRowId: "s", prior: "junk", next: ["x"] }))
      .toEqual({ added: ["x"], removed: [] });
  });

  it("no-op when prior === next", () => {
    expect(planRelationMirror({ srcRowId: "s", prior: ["a", "b"], next: ["a", "b"] }))
      .toEqual({ added: [], removed: [] });
  });
});

describe("applyMirrorToInverse", () => {
  it("adds when not present", () => {
    expect(applyMirrorToInverse(["a"], "b", "add")).toEqual(["a", "b"]);
  });

  it("dedupes on add (idempotent)", () => {
    expect(applyMirrorToInverse(["a", "b"], "b", "add")).toEqual(["a", "b"]);
  });

  it("removes when present", () => {
    expect(applyMirrorToInverse(["a", "b"], "b", "remove")).toEqual(["a"]);
  });

  it("no-op when removing absent id", () => {
    expect(applyMirrorToInverse(["a"], "z", "remove")).toEqual(["a"]);
  });

  it("treats null/undefined current as empty", () => {
    expect(applyMirrorToInverse(null, "x", "add")).toEqual(["x"]);
    expect(applyMirrorToInverse(undefined, "x", "remove")).toEqual([]);
  });
});
