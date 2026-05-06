import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth, requireOwned } from "../../_shared/auth";
import { rateLimit } from "../../_shared/rateLimit";
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
    if (args.text.length > 5_000) throw new Error("Comment too long");
    const { userId } = await requireOwned(ctx, "pages", args.pageId as Id<"pages">);
    await rateLimit(ctx, userId, { scope: "comments.create", max: 30, windowMs: 60_000 });
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
    if (args.text.length > 5_000) throw new Error("Comment too long");
    const userId = await requireAuth(ctx);
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
    const userId = await requireAuth(ctx);
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
    const userId = await requireAuth(ctx);
    const c = await ctx.db.get(args.id as Id<"comments">);
    if (!c || c.userId !== userId) return;
    await ctx.db.delete(args.id as Id<"comments">);
  },
});
