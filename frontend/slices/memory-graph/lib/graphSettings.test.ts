import { describe, it, expect } from "vitest";
import { componentOf, deriveGroups, layoutScaffold } from "./graphSettings";
import type { Graph, GraphNode, GraphEdge } from "@/shared/types/graph";

const node = (id: string, degree = 0): GraphNode => ({ id, title: id, icon: "", kind: "page", degree });
const edge = (source: string, target: string): GraphEdge => ({ source, target, kind: "wikilink", resolved: true });

describe("componentOf", () => {
  it("unifies linked nodes, splits disjoint clusters, reps highest-degree", () => {
    const graph: Graph = {
      nodes: [node("a", 2), node("b", 1), node("c", 1), node("x", 1), node("y", 1)],
      edges: [edge("a", "b"), edge("a", "c"), edge("x", "y")],
    };
    const rep = componentOf(graph);
    expect(rep.get("a")).toBe(rep.get("b"));
    expect(rep.get("a")).toBe(rep.get("c"));
    expect(rep.get("x")).toBe(rep.get("y"));
    expect(rep.get("a")).not.toBe(rep.get("x")); // disjoint clusters differ
    expect(rep.get("b")).toBe("a"); // rep = highest-degree node
  });

  it("isolated node is its own rep", () => {
    expect(componentOf({ nodes: [node("solo")], edges: [] }).get("solo")).toBe("solo");
  });
});

describe("layoutScaffold", () => {
  it("picks the highest-degree pivot and BFS-rings every node from it", () => {
    // a(hub) — b — c ,  a — d ,  x—y disconnected island
    const nodes = [node("a", 3), node("b", 2), node("c", 1), node("d", 1), node("x", 1), node("y", 1)];
    const edges = [edge("a", "b"), edge("b", "c"), edge("a", "d"), edge("x", "y")];
    const { pivot, ring, maxRing } = layoutScaffold(nodes, edges);
    expect(pivot).toBe("a");           // highest degree
    expect(ring.get("a")).toBe(0);     // pivot at centre
    expect(ring.get("b")).toBe(1);
    expect(ring.get("d")).toBe(1);
    expect(ring.get("c")).toBe(2);     // two hops out
    // deepest connected = 2, so disconnected island sits at the outer ring (3)
    expect(maxRing).toBe(3);
    expect(ring.get("x")).toBe(3);
    expect(ring.get("y")).toBe(3);
  });

  it("empty graph → no pivot, no rings", () => {
    const { pivot, ring, maxRing } = layoutScaffold([], []);
    expect(pivot).toBeNull();
    expect(ring.size).toBe(0);
    expect(maxRing).toBe(1);
  });
});

describe("deriveGroups", () => {
  it("one group per multi-node cluster, singletons omitted", () => {
    const graph: Graph = { nodes: [node("a", 1), node("b", 1), node("solo")], edges: [edge("a", "b")] };
    const groups = deriveGroups(graph);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe(componentOf(graph).get("a"));
  });
});
