import { query, type QueryCtx } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id, Doc } from "../../_generated/dataModel";
import { readActiveWorkspace, rowInActiveWorkspace } from "../../_shared/workspace";

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

/** Resolve {page, isOwner}. Returns null when the viewer should see no
 *  comments — not logged in, page missing, page not theirs and not
 *  public, OR owner viewing a page outside their active workspace
 *  (defense-in-depth against stale cross-workspace URLs). */
async function loadPageScope(ctx: QueryCtx, pageId: string) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  let page: Doc<"pages"> | null = null;
  try {
    page = await ctx.db.get(pageId as Id<"pages">);
  } catch {
    return null;
  }
  if (!page) return null;
  const isOwner = page.userId === userId;
  if (!isOwner && !page.isPublic) return null;
  if (isOwner) {
    const active = await readActiveWorkspace(ctx, userId);
    if (active && !rowInActiveWorkspace(page, active, userId)) return null;
  }
  return { page, isOwner };
}

/** Returns comments only when the page is owned by the caller AND in their
 *  active workspace — OR the page is public. Public viewers receive a
 *  sanitized DTO (no userId). */
export const listForPage = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const scope = await loadPageScope(ctx, args.pageId);
    if (!scope) return [];
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .take(500);
    return scope.isOwner ? rows : rows.map(publicDto);
  },
});

/** Block-level comments require the parent page check; resolve via a foreign
 *  key on `comments.pageId` rather than trusting the blockId in isolation. */
export const listForBlock = query({
  args: { blockId: v.string(), pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const scope = await loadPageScope(ctx, args.pageId);
    if (!scope) return [];
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_block", (q) => q.eq("blockId", args.blockId))
      .take(500);
    return scope.isOwner ? rows : rows.map(publicDto);
  },
});
