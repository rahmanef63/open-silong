"use client";

/** Build the reactive knowledge `Graph` client-side from the in-memory pages
 *  store — the same trick `useBacklinks` uses (walk `usePages()`), so the
 *  canvas is live + offline-portable with zero server round-trip.
 *
 *  Node id scheme (shared with server + MCP, see `@/shared/types/graph`):
 *    page  → <pageId>
 *    ghost → 'ghost:' + slug(title)   (unresolved `[[Title]]`)
 *    tag   → 'tag:'   + tag           (nested tag keeps full path 'a/b')
 *
 *  Edges: `parentId` hierarchy (modelled as `page-block` containment) +
 *  extracted `[[wikilink]]` / `[label](/p/id)` mention / `page` block /
 *  `#tag` edges from `extractEdgesFromBlocks`. Wikilink titles resolve to a
 *  page via the slug→id map, else fall back to a ghost node.
 *
 *  Portable: reads `@/shared/lib/store` + `@/shared/lib/graphLinks` only.
 */

import { useMemo } from "react";
import { usePages } from "@/shared/lib/store";
import { extractEdgesFromBlocks, slug } from "@/shared/lib/graphLinks";
import type { Graph, GraphEdge, GraphNode } from "@/shared/types/graph";
import type { Page } from "@/shared/types/domain";
import type { FilterConfig } from "../lib/forceConfig";

export const ghostNodeId = (title: string): string => `ghost:${slug(title)}`;
export const tagNodeId = (tag: string): string => `tag:${tag}`;

function edgeKey(e: GraphEdge): string {
  return `${e.source}|${e.target}|${e.kind}|${e.blockId ?? ""}`;
}

/** Pure builder — exported so it can be unit-tested without React. */
export function buildGraphFromPages(pages: Page[]): Graph {
  const live = pages.filter((p) => !p.trashed);
  const pageIds = new Set(live.map((p) => p.id));

  // slug(title) → first page id. Collisions keep the first (later ones fall to
  // ghost / disambiguation, mirroring the server `titleKey` resolver).
  const titleToId = new Map<string, string>();
  for (const p of live) {
    const key = slug(p.title || "");
    if (key && !titleToId.has(key)) titleToId.set(key, p.id);
  }

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const seenEdge = new Set<string>();

  const ensurePageNode = (p: Page): GraphNode => {
    let n = nodes.get(p.id);
    if (!n) {
      n = {
        id: p.id,
        title: p.title || "Untitled",
        icon: p.icon || "📄",
        kind: "page",
        degree: 0,
        hub: !!p.wiki?.verified,
      };
      nodes.set(p.id, n);
    }
    return n;
  };

  const ensureGhostNode = (title: string): GraphNode => {
    const id = ghostNodeId(title);
    let n = nodes.get(id);
    if (!n) {
      n = { id, title, icon: "○", kind: "ghost", degree: 0 };
      nodes.set(id, n);
    }
    return n;
  };

  const ensureTagNode = (tag: string): GraphNode => {
    const id = tagNodeId(tag);
    let n = nodes.get(id);
    if (!n) {
      n = { id, title: `#${tag}`, icon: "#", kind: "tag", degree: 0 };
      nodes.set(id, n);
    }
    return n;
  };

  const pushEdge = (e: GraphEdge) => {
    const k = edgeKey(e);
    if (seenEdge.has(k)) return;
    seenEdge.add(k);
    edges.push(e);
  };

  // 1. Every live page is a node.
  for (const p of live) ensurePageNode(p);

  // 2. Hierarchy edges (parent → child), modelled as page containment.
  for (const p of live) {
    if (p.parentId && pageIds.has(p.parentId)) {
      pushEdge({ source: p.parentId, target: p.id, kind: "page-block", resolved: true });
    }
  }

  // 3. Content edges from each page's block tree.
  for (const p of live) {
    for (const e of extractEdgesFromBlocks(p.blocks)) {
      if (e.kind === "page-block" || e.kind === "mention") {
        const target = e.targetPageId;
        if (target && pageIds.has(target)) {
          pushEdge({ source: p.id, target, kind: e.kind, resolved: true, blockId: e.blockId });
        }
        continue;
      }
      if (e.kind === "wikilink") {
        const title = (e.targetTitle ?? "").trim();
        if (!title) continue;
        const resolvedId = titleToId.get(slug(title));
        if (resolvedId) {
          pushEdge({ source: p.id, target: resolvedId, kind: "wikilink", resolved: true, blockId: e.blockId });
        } else {
          ensureGhostNode(title);
          pushEdge({ source: p.id, target: ghostNodeId(title), kind: "wikilink", resolved: false, blockId: e.blockId });
        }
        continue;
      }
      if (e.kind === "tag" && e.tag) {
        ensureTagNode(e.tag);
        pushEdge({ source: p.id, target: tagNodeId(e.tag), kind: "tag", resolved: true, blockId: e.blockId });
      }
    }
  }

  // 4. Degrees (both endpoints, only counting edges whose ends exist).
  for (const e of edges) {
    const s = nodes.get(e.source);
    const t = nodes.get(e.target);
    if (s) s.degree += 1;
    if (t) t.degree += 1;
  }

  return { nodes: Array.from(nodes.values()), edges };
}

/** Prune the full model down to what the filter switches allow. Recomputes
 *  connectivity so the orphan filter reflects the post-tag/ghost edge set. */
export function filterGraph(graph: Graph, filter: FilterConfig): Graph {
  const keepNode = (n: GraphNode): boolean => {
    if (n.kind === "tag") return filter.includeTags;
    if (n.kind === "ghost") return filter.includeGhosts;
    return true;
  };

  const present = new Set(graph.nodes.filter(keepNode).map((n) => n.id));
  let edges = graph.edges.filter((e) => present.has(e.source) && present.has(e.target));

  let nodes = graph.nodes.filter((n) => present.has(n.id));

  if (!filter.includeOrphans) {
    const connected = new Set<string>();
    for (const e of edges) {
      connected.add(e.source);
      connected.add(e.target);
    }
    // Only page nodes can be orphans; tag/ghost always carry an edge.
    nodes = nodes.filter((n) => n.kind !== "page" || connected.has(n.id));
    const keep = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => keep.has(e.source) && keep.has(e.target));
  }

  return { nodes, edges };
}

/** Reactive full knowledge graph derived from the pages store. Memoized on
 *  the pages array identity (store returns a stable ref between mutations). */
export function useGraphModel(): Graph {
  const { pages } = usePages();
  return useMemo(() => buildGraphFromPages(pages), [pages]);
}
