import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../../_generated/dataModel";

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
      return existing._id;
    }
    return await ctx.db.insert("files", {
      userId,
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
    await ctx.storage.delete(args.storageId as Id<"_storage">);
    await ctx.db.delete(owned._id);
  },
});
