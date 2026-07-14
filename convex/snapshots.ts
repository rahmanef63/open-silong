import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireOwned } from "./_shared/auth";
import { Id } from "./_generated/dataModel";
import { readActiveWorkspace, rowInActiveWorkspace } from "./_shared/workspace";
import { COUNT_CAPS } from "./_shared/limits";
import { writePageBlocks, buildSearchText } from "./_shared/pageContent";

export const listForPage = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return [];
    const rows = await ctx.db
      .query("snapshots")
      .withIndex("by_user_page", (q) => q.eq("userId", userId).eq("pageId", args.pageId))
      .order("desc")
      .take(50);
    return rows.filter((r) => rowInActiveWorkspace(r, active, userId));
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return [];
    const rows = await ctx.db
      .query("snapshots")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(500);
    return rows.filter((r) => rowInActiveWorkspace(r, active, userId));
  },
});

export const create = mutation({
  args: {
    pageId: v.id("pages"),
    authorName: v.string(),
    takenAt: v.number(),
    title: v.string(),
    icon: v.string(),
    // Mirror the pages.cover union — legacy string + null + new
    // CoverData object (Unsplash / upload / link / color / gradient).
    cover: v.union(
      v.string(),
      v.null(),
      v.object({
        type: v.string(),
        value: v.string(),
        positionY: v.optional(v.number()),
        metadata: v.optional(v.any()),
      }),
    ),
    blocks: v.array(v.any()),
    rowProps: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, doc: page } = await requireOwned(ctx, "pages", args.pageId as Id<"pages">);
    const id = await ctx.db.insert("snapshots", {
      userId,
      // Inherit the parent page's workspaceId so the snapshot scopes
      // alongside its source — listAll already filters via
      // rowInActiveWorkspace for legacy rows without workspaceId.
      workspaceId: page.workspaceId,
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

    // Retention: keep newest COUNT_CAPS.snapshotsPerPage, drop the
    // rest. Bounded fetch (+10) caps the prune burst per insert.
    const recent = await ctx.db
      .query("snapshots")
      .withIndex("by_user_page", (q) => q.eq("userId", userId).eq("pageId", args.pageId))
      .order("desc")
      .take(COUNT_CAPS.snapshotsPerPage + 10);
    if (recent.length > COUNT_CAPS.snapshotsPerPage) {
      for (const stale of recent.slice(COUNT_CAPS.snapshotsPerPage)) {
        await ctx.db.delete(stale._id);
      }
    }

    return id;
  },
});

export const restore = mutation({
  args: { snapshotId: v.id("snapshots") },
  handler: async (ctx, args) => {
    const { doc: snap } = await requireOwned(ctx, "snapshots", args.snapshotId as Id<"snapshots">);
    const { doc: page } = await requireOwned(ctx, "pages", snap.pageId as Id<"pages">);
    const blocks = JSON.parse(JSON.stringify(snap.blocks));
    await writePageBlocks(ctx, snap.pageId as Id<"pages">, blocks, {
      title: snap.title,
      icon: snap.icon,
      cover: snap.cover,
      rowProps: snap.rowProps ? JSON.parse(JSON.stringify(snap.rowProps)) : page.rowProps,
      searchText: buildSearchText(snap.title, blocks),
    });
  },
});
