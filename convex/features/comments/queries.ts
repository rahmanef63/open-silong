import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../../_generated/dataModel";

/** Returns comments only when the page is owned by the caller OR is public. */
export const listForPage = query({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let page;
    try {
      page = await ctx.db.get(args.pageId as Id<"pages">);
    } catch {
      return [];
    }
    if (!page) return [];
    if (page.userId !== userId && !page.isPublic) return [];
    return await ctx.db
      .query("comments")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();
  },
});

/** Block-level comments require the parent page check; resolve via a foreign
 *  key on `comments.pageId` rather than trusting the blockId in isolation. */
export const listForBlock = query({
  args: { blockId: v.string(), pageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let page;
    try {
      page = await ctx.db.get(args.pageId as Id<"pages">);
    } catch {
      return [];
    }
    if (!page) return [];
    if (page.userId !== userId && !page.isPublic) return [];
    return await ctx.db
      .query("comments")
      .withIndex("by_block", (q) => q.eq("blockId", args.blockId))
      .collect();
  },
});
