/** Shared graph-UI state contract — consumed by MemoryGraphView (applies it),
 *  ControlPanel (edits it), and Inspector (reads the selection).
 */

import type { Graph } from "@/shared/types/graph";

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
}

export interface GraphForces {
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
};

export const DEFAULT_FORCES: GraphForces = {
  center: 47,
  repel: 56,
  link: 96,
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
