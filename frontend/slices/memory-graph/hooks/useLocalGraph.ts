"use client";

/** Local (ego) graph — the n-hop neighbourhood around one page, for a panel
 *  that sits beside the backlinks list. BFS over the full client model
 *  (`useGraphModel`) with an undirected adjacency, then re-projects degrees
 *  within the subgraph so node sizes reflect *local* connectivity.
 *
 *  Portable: no convex — pure client model + BFS.
 */

import { useMemo } from "react";
import type { Graph, GraphEdge, GraphNode } from "@/shared/types/graph";
import { useGraphModel } from "./useGraphModel";

/** Undirected adjacency from an edge list. */
export function buildAdjacency(edges: GraphEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    let s = adj.get(a);
    if (!s) adj.set(a, (s = new Set()));
    s.add(b);
  };
  for (const e of edges) {
    add(e.source, e.target);
    add(e.target, e.source);
  }
  return adj;
}

/** BFS reachable-set from `rootId` out to `depth` hops (inclusive). */
export function bfs(adjacency: Map<string, Set<string>>, rootId: string, depth: number): Set<string> {
  const visited = new Set<string>([rootId]);
  let frontier: string[] = [rootId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of adjacency.get(id) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          next.push(nb);
        }
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return visited;
}

/** Ego subgraph around `rootId`. Returns an empty graph when the root is
 *  unknown; a single-node graph (just the page) when it has no neighbours. */
export function egoGraph(model: Graph, rootId: string, depth: number): Graph {
  if (!model.nodes.some((n) => n.id === rootId)) return { nodes: [], edges: [] };
  const adjacency = buildAdjacency(model.edges);
  const visited = bfs(adjacency, rootId, Math.max(1, depth));

  const edges = model.edges.filter((e) => visited.has(e.source) && visited.has(e.target));

  // Local degrees within the subgraph.
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  const nodes: GraphNode[] = model.nodes
    .filter((n) => visited.has(n.id))
    .map((n) => ({ ...n, degree: degree.get(n.id) ?? 0 }));

  return { nodes, edges };
}

export function useLocalGraph(rootId: string | undefined, depth: number): Graph {
  const model = useGraphModel();
  return useMemo(() => {
    if (!rootId) return { nodes: [], edges: [] };
    return egoGraph(model, rootId, depth);
  }, [model, rootId, depth]);
}
