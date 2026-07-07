/** Server-side graph algorithms, pure over `pageLinks` rows + page meta.
 *
 *  Builds the `Graph` shape (nodes + edges) that server queries and MCP
 *  tools return, and the BFS used for local (ego) graphs. The node/edge
 *  types mirror `frontend/shared/types/graph.ts` verbatim — the
 *  frontend↔convex import wall forbids importing them, so keep the two in
 *  sync (they are the ONE contract shared by DB, FE, and MCP).
 */

import type { Doc } from "../_generated/dataModel";
import { slug } from "./links";

/** Mirror of `frontend/shared/types/graph.ts` `EdgeKind`. */
export type EdgeKind = "wikilink" | "page-block" | "mention" | "tag";

/** Mirror of `frontend/shared/types/graph.ts` `GraphNode`. */
export interface GraphNode {
  id: string;
  title: string;
  icon: string;
  kind: "page" | "ghost" | "tag";
  degree: number;
  hub?: boolean;
}

/** Mirror of `frontend/shared/types/graph.ts` `GraphEdge`. */
export interface GraphEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  resolved: boolean;
  blockId?: string;
}

/** Mirror of `frontend/shared/types/graph.ts` `Graph`. */
export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Minimal page projection needed to build graph nodes. */
export interface GraphPageMeta {
  _id: string;
  title: string;
  icon: string;
  wiki?: unknown;
}

export interface BuildGraphOptions {
  /** Include `#tag` nodes + tag edges (default false). */
  includeTags?: boolean;
  /** Include unresolved `[[Title]]` ghost nodes (default true). */
  includeGhosts?: boolean;
  /** Keep degree-0 page nodes (default true). */
  includeOrphans?: boolean;
  /** Cap node count — keeps the highest-degree nodes (default: no cap). */
  limit?: number;
}

/** page=<pageId> · ghost='ghost:'+slug(title) · tag='tag:'+tag */
export function ghostNodeId(title: string): string {
  return `ghost:${slug(title)}`;
}
export function tagNodeId(tag: string): string {
  return `tag:${tag}`;
}

/** Build a `Graph` from raw `pageLinks` rows + the page docs they touch.
 *  Computes node degree, marks wiki pages as hubs, materializes ghost/tag
 *  nodes, and drops dangling edges (targets not in `pages`). */
export function buildGraphFromEdges(
  edges: Doc<"pageLinks">[],
  pages: GraphPageMeta[],
  opts: BuildGraphOptions = {},
): Graph {
  const includeTags = opts.includeTags ?? false;
  const includeGhosts = opts.includeGhosts ?? true;
  const includeOrphans = opts.includeOrphans ?? true;

  const nodes = new Map<string, GraphNode>();
  for (const p of pages) {
    nodes.set(p._id, {
      id: p._id,
      title: p.title || "Untitled",
      icon: p.icon,
      kind: "page",
      degree: 0,
      hub: !!p.wiki,
    });
  }

  const outEdges: GraphEdge[] = [];

  for (const e of edges) {
    const source = e.sourcePageId;
    if (!nodes.has(source)) continue; // source page not in the set — skip

    let target: string | undefined;

    if (e.kind === "tag") {
      if (!includeTags || !e.tag) continue;
      target = tagNodeId(e.tag);
      if (!nodes.has(target)) {
        nodes.set(target, {
          id: target,
          title: `#${e.tag}`,
          icon: "#",
          kind: "tag",
          degree: 0,
        });
      }
    } else if (e.kind === "wikilink") {
      if (e.resolved && e.targetPageId && nodes.has(e.targetPageId)) {
        target = e.targetPageId;
      } else if (includeGhosts && e.targetTitle) {
        target = ghostNodeId(e.targetTitle);
        if (!nodes.has(target)) {
          nodes.set(target, {
            id: target,
            title: e.targetTitle,
            icon: "○",
            kind: "ghost",
            degree: 0,
          });
        }
      } else {
        continue;
      }
    } else {
      // mention / page-block — must resolve to a known page node.
      if (!e.targetPageId || !nodes.has(e.targetPageId)) continue;
      target = e.targetPageId;
    }

    if (!target || target === source) continue;

    outEdges.push({
      source,
      target,
      kind: e.kind,
      resolved: e.resolved,
      blockId: e.sourceBlockId || undefined,
    });
    nodes.get(source)!.degree++;
    nodes.get(target)!.degree++;
  }

  let nodeList = Array.from(nodes.values());

  if (!includeOrphans) {
    nodeList = nodeList.filter((n) => n.degree > 0 || n.kind !== "page");
  }

  if (opts.limit && nodeList.length > opts.limit) {
    nodeList = [...nodeList]
      .sort((a, b) => b.degree - a.degree)
      .slice(0, opts.limit);
  }

  const kept = new Set(nodeList.map((n) => n.id));
  const edgeList = outEdges.filter(
    (e) => kept.has(e.source) && kept.has(e.target),
  );

  return { nodes: nodeList, edges: edgeList };
}

/** Build an undirected adjacency map from graph edges. */
export function buildAdjacency(edges: GraphEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    let s = adj.get(a);
    if (!s) {
      s = new Set<string>();
      adj.set(a, s);
    }
    s.add(b);
  };
  for (const e of edges) {
    link(e.source, e.target);
    link(e.target, e.source);
  }
  return adj;
}

/** Breadth-first set of node ids reachable from `rootId` within `depth`
 *  hops (inclusive of the root). Depth 0 = just the root. */
export function bfs(
  adjacency: Map<string, Set<string>>,
  rootId: string,
  depth: number,
): Set<string> {
  const seen = new Set<string>([rootId]);
  let frontier: string[] = [rootId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      const neighbors = adjacency.get(id);
      if (!neighbors) continue;
      for (const n of neighbors) {
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return seen;
}

/** Resolve a title to a unique page id within a candidate set (same rule
 *  the reindex uses server-side: exactly one slug match wins, else null).
 *  Handy for MCP `note_link` by-title and ghost promotion. */
export function resolveTitleToPageId(
  pages: GraphPageMeta[],
  title: string,
): string | undefined {
  const key = slug(title);
  if (!key) return undefined;
  const matches = pages.filter((p) => slug(p.title) === key);
  return matches.length === 1 ? matches[0]._id : undefined;
}
