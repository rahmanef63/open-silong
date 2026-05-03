import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdminQuery } from "../_shared/auth";

/** User-facing: only published templates. Returns metadata, no full JSON. */
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const docs = await ctx.db
      .query("pageTemplates")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect();
    return docs.map((d) => ({
      _id: d._id,
      name: d.name,
      icon: d.icon,
      category: d.category,
      description: d.description ?? null,
      isSeed: d.isSeed,
    }));
  },
});

/** Admin-only: full list including unpublished. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminQuery(ctx);
    return await ctx.db.query("pageTemplates").order("desc").take(200);
  },
});

export const getOne = query({
  args: { id: v.id("pageTemplates") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const doc = await ctx.db.get(id);
    if (!doc) return null;
    if (!doc.isPublished) {
      // gate full JSON to admin
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
      if (profile?.role !== "admin") return null;
    }
    return doc;
  },
});
