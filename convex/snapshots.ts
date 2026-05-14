import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAuth, requireOwned } from "./_shared/auth";
import { uid } from "./_shared/uid";
import { Id } from "./_generated/dataModel";

export const listForPage = query({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("snapshots")
      .withIndex("by_user_page", (q) => q.eq("userId", userId).eq("pageId", args.pageId))
      .order("desc")
      .take(50);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("snapshots").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(500);
  },
});

export const create = mutation({
  args: {
    pageId: v.string(),
    authorName: v.string(),
    takenAt: v.number(),
    title: v.string(),
    icon: v.string(),
    cover: v.union(v.string(), v.null()),
    blocks: v.array(v.any()),
    rowProps: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOwned(ctx, "pages", args.pageId as Id<"pages">);
    return await ctx.db.insert("snapshots", {
      userId,
      pageId: args.pageId,
      authorId: userId,
      authorName: args.authorName,
      takenAt: args.takenAt,
      title: args.title,
      icon: args.icon,
      cover: args.cover,
      blocks: args.blocks,
      rowProps: args.rowProps,
    });
  },
});

export const restore = mutation({
  args: { snapshotId: v.string() },
  handler: async (ctx, args) => {
    const { doc: snap } = await requireOwned(ctx, "snapshots", args.snapshotId as Id<"snapshots">);
    const { doc: page } = await requireOwned(ctx, "pages", snap.pageId as Id<"pages">);
    await ctx.db.patch(snap.pageId as Id<"pages">, {
      title: snap.title,
      icon: snap.icon,
      cover: snap.cover,
      blocks: JSON.parse(JSON.stringify(snap.blocks)),
      rowProps: snap.rowProps ? JSON.parse(JSON.stringify(snap.rowProps)) : page.rowProps,
      updatedAt: Date.now(),
    });
  },
});
