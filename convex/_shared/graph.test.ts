import { describe, it, expect } from "vitest";
import { buildGraphFromEdges } from "./graph";
import type { GraphPageMeta } from "./graph";
import type { Doc } from "../_generated/dataModel";

// Loose fixture builders — buildGraphFromEdges only reads plain fields.
const page = (id: string, parentId?: string): GraphPageMeta => ({
  _id: id,
  title: id,
  icon: "",
  parentId: parentId ?? null,
});
const link = (source: string, target: string): Doc<"pageLinks"> =>
  ({
    sourcePageId: source,
    targetPageId: target,
    kind: "page-block",
    resolved: true,
    sourceBlockId: "b",
    workspaceId: "w",
  }) as unknown as Doc<"pageLinks">;

describe("buildGraphFromEdges hierarchy synthesis", () => {
  it("connects nested pages via parentId even with no pageLinks", () => {
    const g = buildGraphFromEdges([], [page("A"), page("B", "A"), page("C", "A")]);
    expect(g.nodes).toHaveLength(3);
    expect(g.edges).toHaveLength(2); // A→B, A→C
    expect(g.edges.every((e) => e.source === "A")).toBe(true);
    expect(new Set(g.edges.map((e) => e.target))).toEqual(new Set(["B", "C"]));
  });

  it("does not duplicate a hierarchy edge that already exists as a link", () => {
    const g = buildGraphFromEdges(
      [link("A", "B")],
      [page("A"), page("B", "A"), page("C", "A")],
    );
    expect(g.edges).toHaveLength(2); // A-B (link) + A-C (hierarchy), NOT 3
  });

  it("skips a parentId whose target page is absent (no dangling edge)", () => {
    const g = buildGraphFromEdges([], [page("B", "MISSING")]);
    expect(g.edges).toHaveLength(0);
  });
});
