/** Memory-graph edge taxonomy — the ONE contract shared across the DB
 *  (`convex/schema.ts` `pageLinks.kind`), the server graph algorithms
 *  (`convex/_shared/graph.ts`, which mirrors these shapes because the
 *  frontend↔convex import wall forbids a direct import), the MCP tools,
 *  and the portable `memory-graph` frontend slice.
 *
 *  Node id scheme (stable across FE + server + MCP):
 *    page  node id = <pageId>                (Convex Id string)
 *    ghost node id = 'ghost:' + slug(title)  (unresolved `[[Title]]`)
 *    tag   node id = 'tag:'   + tag          (nested tag keeps full path 'a/b')
 *
 *  Keep this in sync with the mirrored copy in `convex/_shared/graph.ts`.
 */

/** The four ways one page can point at another thing in the graph. */
export type EdgeKind = "wikilink" | "page-block" | "mention" | "tag";

export interface GraphNode {
  /** page=<pageId> · ghost='ghost:'+slug(title) · tag='tag:'+tag */
  id: string;
  title: string;
  icon: string;
  kind: "page" | "ghost" | "tag";
  /** Incident-edge count — drives node size in the force graph. */
  degree: number;
  /** Wiki-verified page → rendered as a hub (bigger/brighter). */
  hub?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  resolved: boolean;
  /** Source block the link lives in (backlink previews / jump-to). */
  blockId?: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
