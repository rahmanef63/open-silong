import { mutation } from "../../_generated/server";
import type { MutationCtx } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth, requireOwned } from "../../_shared/auth";
import { rateLimit } from "../../_shared/rateLimit";
import { CHAR_CAPS, RATE_LIMITS } from "../../_shared/limits";
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
    if (args.text.length > CHAR_CAPS.commentText) throw new Error("Comment too long");
    const { userId } = await requireOwned(ctx, "pages", args.pageId as Id<"pages">);
    await rateLimit(ctx, userId, RATE_LIMITS.commentsCreate);
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
    if (args.text.length > CHAR_CAPS.commentText) throw new Error("Comment too long");
    const userId = await requireAuth(ctx);
    const c = await ctx.db.get(args.id as Id<"comments">);
    if (!c || c.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id as Id<"comments">, {
      text: args.text,
      updatedAt: Date.now(),
    });
  },
});

/** Allow when the actor is either the comment author OR the page owner.
 *  Page-owner moderation is what closes the public-write audit gap. */
async function loadAndAuthorize(
  ctx: MutationCtx,
  userId: Id<"users">,
  commentId: Id<"comments">,
) {
  const c = await ctx.db.get(commentId);
  if (!c) return null;
  if (c.userId === userId) return c;
  const page = await ctx.db.get(c.pageId as Id<"pages">);
  if (page && page.userId === userId) return c;
  return null;
}

export const resolve = mutation({
  args: { id: v.string(), resolved: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const c = await loadAndAuthorize(ctx, userId, args.id as Id<"comments">);
    if (!c) throw new Error("Not found");
    await ctx.db.patch(c._id, {
      resolved: args.resolved,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const c = await loadAndAuthorize(ctx, userId, args.id as Id<"comments">);
    if (!c) return;
    await ctx.db.delete(c._id);
  },
});
