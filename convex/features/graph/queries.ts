/** Public graph read API for the memory-graph slice + the graph MCP tools.
 *
 *  Every handler declares `args:{v.*}` validators and gates authz inside
 *  the handler (CLAUDE.md P0). Two gating shapes are used:
 *
 *   - Workspace-active reads (no id arg) — `getGlobalGraph`, `listTags`,
 *     `listByTag` — resolve the viewer's active workspace via
 *     `readActiveWorkspace`, which only returns a workspace the user is a
 *     verified member of (or their own personal one). Same pattern as
 *     `features/search/queries.ts`.
 *   - Page-scoped reads — `getLocalGraph`, `listBacklinks`, `listOutgoing`
 *     — resolve the page and enforce membership of its workspace via
 *     `requireWorkspaceAccess` (with the legacy owner-only fallback).
 *
 *  All index walks are bounded (no bare `.collect()`).
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import type { Doc } from "../../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  readActiveWorkspace,
  pagesInActiveWorkspace,
  databasesInActiveWorkspace,
} from "../../_shared/workspace";
import { requireWorkspaceAccess } from "../../_shared/auth";
import {
  buildGraphFromEdges,
  buildAdjacency,
  bfs,
  type Graph,
} from "../../_shared/graph";
import {
  pageMeta,
  collectOutgoing,
  pagesInSameWorkspace,
  augmentWithDatabases,
  BACKLINKS_CAP,
  LINKS_PER_PAGE_CAP,
  TAG_SCAN_CAP,
  PAGES_BY_TAG_CAP,
  GRAPH_PAGE_CAP,
} from "./lib";

const EMPTY_GRAPH: Graph = { nodes: [], edges: [] };

/** Whole-workspace force-graph model. Edges are fanned out per source
 *  page (no single by_workspace index over `pageLinks`), then reduced by
 *  `buildGraphFromEdges` (degree, hubs, ghost/tag materialization). */
export const getGlobalGraph = query({
  args: {
    includeTags: v.optional(v.boolean()),
    includeGhosts: v.optional(v.boolean()),
    includeOrphans: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Graph> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return EMPTY_GRAPH;
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return EMPTY_GRAPH;

    const pages = await pagesInActiveWorkspace(ctx, userId, active);
    const live = pages.filter((p) => !p.trashed);
    const edges = await collectOutgoing(ctx, live);

    const limit =
      args.limit && args.limit > 0
        ? Math.min(args.limit, GRAPH_PAGE_CAP)
        : undefined;

    const base = buildGraphFromEdges(edges, live.map(pageMeta), {
      includeTags: args.includeTags,
      includeGhosts: args.includeGhosts,
      includeOrphans: args.includeOrphans,
      limit,
    });

    // Layer the database structure on top at query time: database nodes,
    // db → row-page edges, and row → related-page relation edges. Reuses the
    // same by_workspace read (+ legacy by_user fallback) that pages use.
    const databases = await databasesInActiveWorkspace(ctx, userId, active);
    const pagesById = new Map<string, Doc<"pages">>(
      live.map((p) => [p._id, p]),
    );
    return augmentWithDatabases(
      base,
      databases.filter((d) => !d.trashed),
      pagesById,
    );
  },
});

/** Ego (local) graph around one page: build the full workspace graph,
 *  then BFS `depth` hops (clamped 1..3) from the page node. Tags + ghosts
 *  are always materialized so the neighborhood shows every incident
 *  edge kind. */
export const getLocalGraph = query({
  args: { pageId: v.id("pages"), depth: v.number() },
  handler: async (ctx, { pageId, depth }): Promise<Graph> => {
    const { doc } = await requireWorkspaceAccess(ctx, "pages", pageId);
    const d = Math.max(1, Math.min(3, Math.floor(depth)));

    const pages = await pagesInSameWorkspace(ctx, doc);
    const live = pages.filter((p) => !p.trashed);
    const edges = await collectOutgoing(ctx, live);

    const full = buildGraphFromEdges(edges, live.map(pageMeta), {
      includeTags: true,
      includeGhosts: true,
      includeOrphans: true,
    });

    const adjacency = buildAdjacency(full.edges);
    const keep = bfs(adjacency, pageId, d);
    return {
      nodes: full.nodes.filter((n) => keep.has(n.id)),
      edges: full.edges.filter((e) => keep.has(e.source) && keep.has(e.target)),
    };
  },
});

/** Incoming edges to a page + the source page's `{title, icon}` for
 *  rendering the backlinks panel. Trashed / missing sources are dropped. */
export const listBacklinks = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    await requireWorkspaceAccess(ctx, "pages", pageId);
    const rows = await ctx.db
      .query("pageLinks")
      .withIndex("by_target", (q) => q.eq("targetPageId", pageId))
      .take(BACKLINKS_CAP);

    const cache = new Map<string, { title: string; icon: string } | null>();
    const out: Array<{
      sourcePageId: Doc<"pages">["_id"];
      sourceBlockId?: string;
      kind: Doc<"pageLinks">["kind"];
      resolved: boolean;
      title: string;
      icon: string;
    }> = [];
    for (const r of rows) {
      const key = String(r.sourcePageId);
      let meta = cache.get(key);
      if (meta === undefined) {
        const p = await ctx.db.get(r.sourcePageId);
        meta = p && !p.trashed ? { title: p.title || "Untitled", icon: p.icon } : null;
        cache.set(key, meta);
      }
      if (!meta) continue;
      out.push({
        sourcePageId: r.sourcePageId,
        sourceBlockId: r.sourceBlockId || undefined,
        kind: r.kind,
        resolved: r.resolved,
        title: meta.title,
        icon: meta.icon,
      });
    }
    return out;
  },
});

/** Outgoing edges from a page — resolved page links, unresolved ghosts,
 *  and tag edges. Resolved targets are hydrated with `{title, icon}`; a
 *  target that is now trashed/missing is reported as unresolved so the UI
 *  can dim it. */
export const listOutgoing = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    await requireWorkspaceAccess(ctx, "pages", pageId);
    const rows = await ctx.db
      .query("pageLinks")
      .withIndex("by_source", (q) => q.eq("sourcePageId", pageId))
      .take(LINKS_PER_PAGE_CAP);

    const cache = new Map<string, { title: string; icon: string } | null>();
    const out: Array<{
      kind: Doc<"pageLinks">["kind"];
      resolved: boolean;
      targetPageId?: Doc<"pages">["_id"];
      targetTitle?: string;
      tag?: string;
      title?: string;
      icon?: string;
      blockId?: string;
    }> = [];
    for (const r of rows) {
      let meta: { title: string; icon: string } | null = null;
      if (r.targetPageId) {
        const key = String(r.targetPageId);
        let cached = cache.get(key);
        if (cached === undefined) {
          const p = await ctx.db.get(r.targetPageId);
          cached = p && !p.trashed ? { title: p.title || "Untitled", icon: p.icon } : null;
          cache.set(key, cached);
        }
        meta = cached;
      }
      out.push({
        kind: r.kind,
        resolved: r.resolved && !!meta,
        targetPageId: meta ? r.targetPageId : undefined,
        targetTitle: r.targetTitle,
        tag: r.tag,
        title: meta?.title,
        icon: meta?.icon,
        blockId: r.sourceBlockId || undefined,
      });
    }
    return out;
  },
});

/** Tag pane — every `#tag` in the active workspace with its note count
 *  (distinct source pages). Walks `by_workspace_tag`, skipping the
 *  non-tag rows (their `tag` is undefined) via a `gt("tag","")` range so
 *  the scan budget is spent on real tags. */
export const listTags = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [] as Array<{ tag: string; count: number }>;
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return [] as Array<{ tag: string; count: number }>;

    const rows = await ctx.db
      .query("pageLinks")
      .withIndex("by_workspace_tag", (q) =>
        q.eq("workspaceId", active._id).gt("tag", ""),
      )
      .take(TAG_SCAN_CAP);

    const perTag = new Map<string, Set<string>>();
    for (const r of rows) {
      if (r.kind !== "tag" || !r.tag) continue;
      let s = perTag.get(r.tag);
      if (!s) {
        s = new Set<string>();
        perTag.set(r.tag, s);
      }
      s.add(String(r.sourcePageId));
    }
    return Array.from(perTag.entries())
      .map(([tag, pages]) => ({ tag, count: pages.size }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  },
});

/** Pages carrying a given tag (distinct, non-trashed). Accepts the tag
 *  with or without a leading `#`. */
export const listByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, { tag }) => {
    const userId = await getAuthUserId(ctx);
    const empty: Array<{
      pageId: Doc<"pages">["_id"];
      title: string;
      icon: string;
    }> = [];
    if (!userId) return empty;
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return empty;
    const key = tag.trim().replace(/^#/, "");
    if (!key) return empty;

    const rows = await ctx.db
      .query("pageLinks")
      .withIndex("by_workspace_tag", (q) =>
        q.eq("workspaceId", active._id).eq("tag", key),
      )
      .take(PAGES_BY_TAG_CAP);

    const seen = new Set<string>();
    const out = empty;
    for (const r of rows) {
      const k = String(r.sourcePageId);
      if (seen.has(k)) continue;
      seen.add(k);
      const p = await ctx.db.get(r.sourcePageId);
      if (!p || p.trashed) continue;
      out.push({ pageId: p._id, title: p.title || "Untitled", icon: p.icon });
    }
    return out;
  },
});
