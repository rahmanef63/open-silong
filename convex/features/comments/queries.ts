import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id, Doc } from "../../_generated/dataModel";

/** Public viewers see no userId — only display name/icon. Owners see the
 *  full row so the moderation UI can resolve actorId. */
function publicDto(c: Doc<"comments">) {
  return {
    _id: c._id,
    _creationTime: c._creationTime,
    pageId: c.pageId,
    blockId: c.blockId,
    text: c.text,
    authorName: c.authorName,
    authorIcon: c.authorIcon,
    resolved: c.resolved,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/** Returns comments only when the page is owned by the caller OR is public.
 *  Public viewers receive a sanitized DTO (no userId). */
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
    const isOwner = page.userId === userId;
    if (!isOwner && !page.isPublic) return [];
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .take(500);
    return isOwner ? rows : rows.map(publicDto);
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
    const isOwner = page.userId === userId;
    if (!isOwner && !page.isPublic) return [];
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_block", (q) => q.eq("blockId", args.blockId))
      .take(500);
    return isOwner ? rows : rows.map(publicDto);
  },
});
