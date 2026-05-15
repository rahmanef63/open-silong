import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../_shared/auth";
import { rateLimit } from "../../_shared/rateLimit";
import { CHAR_CAPS, RATE_LIMITS } from "../../_shared/limits";
import { Id } from "../../_generated/dataModel";
import { getActiveWorkspaceMutation } from "../../_shared/workspace";

export const create = mutation({
  args: {
    kind: v.union(
      v.literal("mention"),
      v.literal("comment"),
      v.literal("share"),
      v.literal("system"),
      v.literal("update"),
    ),
    title: v.string(),
    body: v.optional(v.string()),
    pageId: v.optional(v.string()),
    blockId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    actorIcon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.title.length > CHAR_CAPS.inboxTitle) throw new Error("Title too long");
    if (args.body && args.body.length > CHAR_CAPS.inboxBody) throw new Error("Body too long");
    const userId = await requireAuth(ctx);
    await rateLimit(ctx, userId, RATE_LIMITS.inboxCreate);
    // Stamp the active workspace so listings filter cleanly per
    // workspace; legacy rows without workspaceId stay visible only
    // in the personal workspace via rowInActiveWorkspace.
    const active = await getActiveWorkspaceMutation(ctx, userId);
    return await ctx.db.insert("notifications", {
      userId,
      workspaceId: active._id,
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
    const userId = await requireAuth(ctx);
    const note = await ctx.db.get(args.id as Id<"notifications">);
    if (!note || note.userId !== userId) return;
    await ctx.db.patch(args.id as Id<"notifications">, { read: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("read", false))
      .take(500);
    await Promise.all(items.map((n) => ctx.db.patch(n._id, { read: true })));
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const note = await ctx.db.get(args.id as Id<"notifications">);
    if (!note || note.userId !== userId) return;
    await ctx.db.delete(args.id as Id<"notifications">);
  },
});
