import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../../_generated/dataModel";

export const create = mutation({
  args: {
    pageId: v.string(),
    blockId: v.optional(v.string()),
    text: v.string(),
    authorName: v.string(),
    authorIcon: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    let page;
    try {
      page = await ctx.db.get(args.pageId as Id<"pages">);
    } catch {
      throw new Error("Not found");
    }
    if (!page || (page.userId !== userId && !page.isPublic)) {
      throw new Error("Not authorized");
    }
    const now = Date.now();
    return await ctx.db.insert("comments", {
      userId,
      pageId: args.pageId,
      blockId: args.blockId,
      text: args.text,
      authorName: args.authorName,
      authorIcon: args.authorIcon,
      resolved: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { id: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const c = await ctx.db.get(args.id as Id<"comments">);
    if (!c || c.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id as Id<"comments">, {
      text: args.text,
      updatedAt: Date.now(),
    });
  },
});

export const resolve = mutation({
  args: { id: v.string(), resolved: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const c = await ctx.db.get(args.id as Id<"comments">);
    if (!c || c.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id as Id<"comments">, {
      resolved: args.resolved,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const c = await ctx.db.get(args.id as Id<"comments">);
    if (!c || c.userId !== userId) return;
    await ctx.db.delete(args.id as Id<"comments">);
  },
});
