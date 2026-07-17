/** Shared graph-UI state contract — consumed by MemoryGraphView (applies it),
 *  ControlPanel (edits it), and Inspector (reads the selection).
 */

import type { Graph, GraphNode, GraphEdge } from "@/shared/types/graph";

export interface GraphFilters {
  /** Free-text search over title/body/tags. */
  query: string;
  /** Show `#tag` nodes. */
  showTags: boolean;
  /** Show database nodes + their row sub-nodes. */
  showDatabases: boolean;
  /** Show unresolved `[[ghost]]` nodes. */
  showGhosts: boolean;
  /** Show degree-0 page nodes. */
  showOrphans: boolean;
  /** Hub (group) ids the user has toggled OFF. */
  hiddenGroups: string[];
}

export interface GraphDisplay {
  /** Directional arrowheads on edges. */
  arrows: boolean;
  /** 0..100 — higher fades leaf labels sooner when zoomed out. */
  textFade: number;
  /** 70..145 (%) — node radius multiplier. */
  nodeSize: number;
  /** 60..240 (%) — edge stroke width multiplier. */
  linkThickness: number;
  /** Tint nodes by connected-component (categorical hue). */
  colorGroups: boolean;
}

/** Arrangement pattern applied on top of the shared repel/link physics.
 *  - `web`     — organic cloud; connected-component clusters (default).
 *  - `radial`  — concentric rings around the most-connected node ("globe";
 *                distance from centre = hop-distance from the hub).
 *  - `layered` — neural-style columns ordered by hop-distance (left→right flow). */
export type GraphLayout = "web" | "radial" | "layered";

export interface GraphForces {
  /** Arrangement pattern (web / radial / layered). */
  layout: GraphLayout;
  /** 0..100 — pull toward anchor/centre. */
  center: number;
  /** 0..100 — node-to-node repulsion. */
  repel: number;
  /** 0..100 — edge spring stiffness. */
  link: number;
  /** 80..260 (px) — preferred edge length. */
  linkDistance: number;
  /** Run the live force simulation. */
  animate: boolean;
}

/** A top-level hub, surfaced as a toggleable "group" in the control panel. */
export interface GroupInfo {
  id: string;
  label: string;
  icon?: string;
}

export const DEFAULT_FILTERS: GraphFilters = {
  query: "",
  showTags: false,
  showDatabases: true,
  showGhosts: true,
  showOrphans: true,
  hiddenGroups: [],
};

export const DEFAULT_DISPLAY: GraphDisplay = {
  arrows: false,
  textFade: 42,
  nodeSize: 100,
  linkThickness: 100,
  colorGroups: true,
};

// Tuned for the d3-force model (see MemoryGraphView REPEL_SCALE / CENTER_K and
// the degree-normalised link springs). Airy, legible first paint — link 85
// holds leaves firmly at ~link-distance, repel 50 gives clumpy Obsidian-style
// clusters, weak centre keeps it framed. Every slider has travel both ways.
export const DEFAULT_FORCES: GraphForces = {
  layout: "web",
  center: 40,
  repel: 50,
  link: 85,
  linkDistance: 170,
  animate: false,
};

/** Connected-component map: every node id → the id of its component's
 *  representative (highest-degree node in that component). Hierarchy-free
 *  grouping for the Obsidian-style cloud — clusters that share no link are
 *  distinct groups, replacing the old "hub = core's neighbours" model.
 *  Shared by `deriveGroups` (the toggle list) and the renderer (`groupOf`). */
export function componentOf(graph: Graph): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    while (parent.get(x) !== r) { const nx = parent.get(x)!; parent.set(x, r); x = nx; }
    return r;
  };
  for (const n of graph.nodes) parent.set(n.id, n.id);
  for (const e of graph.edges) {
    if (!parent.has(e.source) || !parent.has(e.target)) continue;
    const a = find(e.source), b = find(e.target);
    if (a !== b) parent.set(a, b);
  }
  const best = new Map<string, { id: string; degree: number }>();
  for (const n of graph.nodes) {
    const root = find(n.id);
    const cur = best.get(root);
    if (!cur || n.degree > cur.degree) best.set(root, { id: n.id, degree: n.degree });
  }
  const rep = new Map<string, string>();
  for (const n of graph.nodes) rep.set(n.id, best.get(find(n.id))!.id);
  return rep;
}

/** Layout scaffolding for the `radial` (globe) + `layered` (neural) patterns:
 *  the pivot (highest-degree node) and each node's BFS hop-distance ("ring")
 *  from it over the given edges. Disconnected nodes settle one ring past the
 *  deepest connected node. Pure — driven by the visible node/edge set. */
export function layoutScaffold(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { pivot: string | null; ring: Map<string, number>; maxRing: number } {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) { adj.get(e.source)?.push(e.target); adj.get(e.target)?.push(e.source); }
  let pivot: string | null = null, bestDeg = -1;
  for (const n of nodes) { const d = n.degree || 0; if (d > bestDeg) { bestDeg = d; pivot = n.id; } }
  const ring = new Map<string, number>();
  if (pivot) {
    ring.set(pivot, 0);
    const q = [pivot];
    for (let i = 0; i < q.length; i++) {
      const r = ring.get(q[i])! + 1;
      for (const nb of adj.get(q[i]) ?? []) if (!ring.has(nb)) { ring.set(nb, r); q.push(nb); }
    }
  }
  let maxRing = 0;
  for (const r of ring.values()) if (r > maxRing) maxRing = r;
  const outer = maxRing + 1;
  for (const n of nodes) if (!ring.has(n.id)) ring.set(n.id, outer);
  return { pivot, ring, maxRing: outer };
}

/** Multi-node clusters, surfaced as toggleable groups in the control panel.
 *  One entry per connected component with ≥2 nodes, labelled by its
 *  representative (highest-degree) node. Singletons are omitted. */
export function deriveGroups(graph: Graph): GroupInfo[] {
  const rep = componentOf(graph);
  const size = new Map<string, number>();
  for (const r of rep.values()) size.set(r, (size.get(r) ?? 0) + 1);
  const byId = new Map(graph.nodes.map((n) => [n.id, n] as const));
  const groups: GroupInfo[] = [];
  const seen = new Set<string>();
  for (const repId of rep.values()) {
    if (seen.has(repId) || (size.get(repId) ?? 0) < 2) continue;
    seen.add(repId);
    const n = byId.get(repId);
    if (n) groups.push({ id: repId, label: n.title || "Untitled", icon: n.icon || undefined });
  }
  return groups;
}
