import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../../_generated/dataModel";

export const create = mutation({
  args: {
    kind: v.string(),
    title: v.string(),
    body: v.optional(v.string()),
    pageId: v.optional(v.string()),
    blockId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    actorIcon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("notifications", {
      userId,
      kind: args.kind,
      title: args.title,
      body: args.body,
      pageId: args.pageId,
      blockId: args.blockId,
      actorName: args.actorName,
      actorIcon: args.actorIcon,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const markRead = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const note = await ctx.db.get(args.id as Id<"notifications">);
    if (!note || note.userId !== userId) return;
    await ctx.db.patch(args.id as Id<"notifications">, { read: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("read", false))
      .collect();
    for (const n of items) await ctx.db.patch(n._id, { read: true });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const note = await ctx.db.get(args.id as Id<"notifications">);
    if (!note || note.userId !== userId) return;
    await ctx.db.delete(args.id as Id<"notifications">);
  },
});
