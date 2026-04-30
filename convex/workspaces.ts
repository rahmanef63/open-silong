import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

export const get = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.query("workspaces").withIndex("by_user", (q) => q.eq("userId", userId)).first();
  },
});

export const upsert = mutation({
  args: { name: v.string(), emoji: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.query("workspaces").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { name: args.name, emoji: args.emoji });
    } else {
      await ctx.db.insert("workspaces", { userId, name: args.name, emoji: args.emoji });
    }
  },
});
