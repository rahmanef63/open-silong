import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const MAX_RESULTS = 20;

export const search = query({
  args: { q: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { q, limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { pages: [], databases: [] };
    const trimmed = q.trim();
    if (!trimmed) return { pages: [], databases: [] };
    const cap = Math.min(MAX_RESULTS, limit ?? MAX_RESULTS);

    const pages = await ctx.db
      .query("pages")
      .withSearchIndex("search_title", (b) =>
        b.search("title", trimmed).eq("userId", userId).eq("trashed", false),
      )
      .take(cap);

    // databases.trashed is optional → filter post-query (undefined ≠ false in eq)
    const dbHits = await ctx.db
      .query("databases")
      .withSearchIndex("search_name", (b) =>
        b.search("name", trimmed).eq("userId", userId),
      )
      .take(cap);
    const databases = dbHits.filter((d) => !d.trashed);

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
