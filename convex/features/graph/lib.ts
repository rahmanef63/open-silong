/** Query-support helpers for the memory-graph feature.
 *
 *  The pure graph algorithms (`buildGraphFromEdges`, `buildAdjacency`,
 *  `bfs`) live in `convex/_shared/graph.ts` (foundation) and the edge
 *  extractor/reindexer in `convex/_shared/links.ts`. This module only
 *  holds the DB-touching helpers the graph queries share: page → node
 *  projection, the by_source edge fan-out, and same-workspace page reads.
 *
 *  Every index walk is bounded (CLAUDE.md P0: no bare `.collect()`).
 *  Where a matching cap already exists in `_shared/limits.ts` we reuse it;
 *  the graph-specific caps below are runaway guards, not product limits.
 */

import type { QueryCtx } from "../../_generated/server";
import type { Doc } from "../../_generated/dataModel";
import { COUNT_CAPS } from "../../_shared/limits";
import type { GraphPageMeta } from "../../_shared/graph";

/** Outgoing edges fetched per source page (`pageLinks.by_source`). A page
 *  with more links than this is pathological; the cap guards the handler. */
export const LINKS_PER_PAGE_CAP = 1_000;
/** Incoming edges fetched for one backlinks read (`pageLinks.by_target`). */
export const BACKLINKS_CAP = 1_000;
/** Rows scanned for the tag pane (`pageLinks.by_workspace_tag`, tag slice). */
export const TAG_SCAN_CAP = 10_000;
/** Tag → pages fan-out cap (`pageLinks.by_workspace_tag` eq tag). */
export const PAGES_BY_TAG_CAP = 1_000;
/** Page-node budget for a workspace graph — reuse the dashboard scan cap so
 *  the graph never walks more page rows than the rest of the app already
 *  does per read. */
export const GRAPH_PAGE_CAP = COUNT_CAPS.pagesPerWorkspaceScan;

/** Project a page doc to the minimal shape `buildGraphFromEdges` needs.
 *  `wiki` (verified marker) flags the node as a hub. */
export function pageMeta(p: Doc<"pages">): GraphPageMeta {
  return {
    _id: p._id,
    title: p.title || "Untitled",
    icon: p.icon,
    wiki: p.wiki,
  };
}

/** Fetch every outgoing `pageLinks` row for a set of source pages (bounded
 *  per source). Used to assemble a whole-workspace edge set: there is no
 *  single by_workspace index over `pageLinks`, so we fan out by_source. */
export async function collectOutgoing(
  ctx: QueryCtx,
  pages: Doc<"pages">[],
): Promise<Doc<"pageLinks">[]> {
  const edges: Doc<"pageLinks">[] = [];
  for (const p of pages) {
    const rows = await ctx.db
      .query("pageLinks")
      .withIndex("by_source", (q) => q.eq("sourcePageId", p._id))
      .take(LINKS_PER_PAGE_CAP);
    for (const r of rows) edges.push(r);
  }
  return edges;
}

/** All pages in the same workspace as `page` (trashed included — the
 *  caller drops them). Prefers the `by_workspace` index; legacy
 *  (un-workspaced) rows fall back to the owner's `by_user` index so a
 *  page that never got a workspaceId still yields a local graph. */
export async function pagesInSameWorkspace(
  ctx: QueryCtx,
  page: Doc<"pages">,
): Promise<Doc<"pages">[]> {
  const wsId = page.workspaceId;
  if (wsId) {
    return ctx.db
      .query("pages")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", wsId))
      .take(GRAPH_PAGE_CAP);
  }
  return ctx.db
    .query("pages")
    .withIndex("by_user", (q) => q.eq("userId", page.userId))
    .take(GRAPH_PAGE_CAP);
}
