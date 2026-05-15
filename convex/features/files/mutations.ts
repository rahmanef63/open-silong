import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../../_generated/dataModel";
import { getActiveWorkspaceMutation, rowInActiveWorkspace } from "../../_shared/workspace";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Record ownership of an uploaded blob. Client calls this immediately after
 * the POST to the upload URL returns its storageId. Ownership is checked
 * before remove() will delete; without this row the blob is unowned and
 * cannot be deleted by the client.
 *
 * Stamps the viewer's active workspace so per-workspace storage accounting
 * + future workspace-scoped export bundles can attribute the blob.
 */
export const confirmUpload = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("files")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .first();
    if (existing) {
      if (existing.userId !== userId) throw new Error("Not authorized");
      // Backfill workspaceId for legacy rows so the workspace gate has
      // something to read on subsequent calls.
      if (!existing.workspaceId) {
        const ws = await getActiveWorkspaceMutation(ctx, userId);
        await ctx.db.patch(existing._id, { workspaceId: ws._id });
      }
      return existing._id;
    }
    const ws = await getActiveWorkspaceMutation(ctx, userId);
    return await ctx.db.insert("files", {
      userId,
      workspaceId: ws._id,
      storageId,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const owned = await ctx.db
      .query("files")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .first();
    if (!owned || owned.userId !== userId) {
      // Either no ownership record (orphan from before this gate) or another
      // user's blob — refuse silently to avoid leaking existence.
      throw new Error("Not authorized");
    }
    // Workspace gate — block deletion of files from another workspace
    // even if the row's userId matches (e.g. a personal-workspace file
    // visible while the user has a shared workspace active). Legacy
    // rows w/o workspaceId pass through via rowInActiveWorkspace.
    const ws = await getActiveWorkspaceMutation(ctx, userId);
    if (!rowInActiveWorkspace(owned, ws, userId)) {
      throw new Error("Not authorized");
    }
    await ctx.storage.delete(args.storageId as Id<"_storage">);
    await ctx.db.delete(owned._id);
  },
});
