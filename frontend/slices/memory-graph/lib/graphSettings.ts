/** Shared graph-UI state contract — consumed by MemoryGraphView (applies it),
 *  ControlPanel (edits it), and Inspector (reads the selection).
 */

import type { Graph } from "@/shared/types/graph";

export interface GraphFilters {
  /** Free-text search over title/body/tags. */
  query: string;
  /** Show `#tag` nodes. */
  showTags: boolean;
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

/** The graph's top-level hubs, surfaced as toggleable groups. Hub = the
 *  highest-degree page's direct neighbours (same rule the renderer uses). */
export function deriveGroups(graph: Graph): GroupInfo[] {
  const adj = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    let s = adj.get(a);
    if (!s) adj.set(a, (s = new Set()));
    s.add(b);
  };
  for (const e of graph.edges) {
    add(e.source, e.target);
    add(e.target, e.source);
  }
  let core: { id: string; degree: number } | null = null;
  for (const n of graph.nodes) {
    if (n.kind !== "page") continue;
    if (!core || n.degree > core.degree) core = { id: n.id, degree: n.degree };
  }
  if (!core) return [];
  const hubIds = adj.get(core.id) ?? new Set<string>();
  return graph.nodes
    .filter((n) => n.kind === "page" && hubIds.has(n.id))
    .map((n) => ({ id: n.id, label: n.title || "Untitled", icon: n.icon || undefined }));
}
