import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readActiveWorkspace } from "../../_shared/workspace";

const MAX_RESULTS = 20;

export const search = query({
  args: { q: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { q, limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { pages: [], databases: [] };
    const trimmed = q.trim();
    if (!trimmed) return { pages: [], databases: [] };
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return { pages: [], databases: [] };
    const cap = Math.min(MAX_RESULTS, limit ?? MAX_RESULTS);

    // Workspace-scoped search: every member of the active workspace sees the
    // same hits. Legacy unstamped rows fall back to owner-only (only the
    // viewer's own personal-workspace pages without `workspaceId`).
    const wsHits = await ctx.db
      .query("pages")
      .withSearchIndex("search_content", (b) =>
        b.search("searchText", trimmed).eq("workspaceId", active._id).eq("trashed", false),
      )
      .take(cap * 2);
    let pages = wsHits;
    if (active.isPersonal && (active.ownerId ?? active.userId) === userId) {
      const legacyHits = await ctx.db
        .query("pages")
        .withSearchIndex("search_content", (b) =>
          b.search("searchText", trimmed).eq("userId", userId).eq("trashed", false),
        )
        .take(cap * 2);
      const seen = new Set(pages.map((p) => p._id));
      for (const p of legacyHits) {
        if (!p.workspaceId && !seen.has(p._id)) pages.push(p);
      }
    }
    pages = pages.slice(0, cap);

    // Boost: pages whose title matches query come first (preserve relative order otherwise)
    const ql = trimmed.toLowerCase();
    const titleMatch = (t: string) => t.toLowerCase().includes(ql);
    pages.sort((a, b) => {
      const am = titleMatch(a.title) ? 1 : 0;
      const bm = titleMatch(b.title) ? 1 : 0;
      return bm - am;
    });

    // databases.trashed is optional → filter post-query (undefined ≠ false in eq)
    const dbWsHits = await ctx.db
      .query("databases")
      .withSearchIndex("search_name", (b) =>
        b.search("name", trimmed).eq("workspaceId", active._id),
      )
      .take(cap * 2);
    const dbHits = dbWsHits;
    if (active.isPersonal && (active.ownerId ?? active.userId) === userId) {
      const legacyDbs = await ctx.db
        .query("databases")
        .withSearchIndex("search_name", (b) => b.search("name", trimmed).eq("userId", userId))
        .take(cap * 2);
      const seen = new Set(dbHits.map((d) => d._id));
      for (const d of legacyDbs) {
        if (!d.workspaceId && !seen.has(d._id)) dbHits.push(d);
      }
    }
    const databases = dbHits.filter((d) => !d.trashed).slice(0, cap);

    return {
      pages: pages.map((p) => ({
        id: p._id,
        title: p.title,
        icon: p.icon,
        parentId: p.parentId,
        rowOfDatabaseId: p.rowOfDatabaseId,
        updatedAt: p.updatedAt,
      })),
      databases: databases.map((d) => ({
        id: d._id,
        name: d.name,
        icon: d.icon,
        updatedAt: d.updatedAt,
      })),
    };
  },
});
