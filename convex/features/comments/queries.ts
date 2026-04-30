import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listForPage = query({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("comments")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();
  },
});

export const listForBlock = query({
  args: { blockId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("comments")
      .withIndex("by_block", (q) => q.eq("blockId", args.blockId))
      .collect();
  },
});
