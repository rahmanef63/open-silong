import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rec = await ctx.db.query("recents").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    return rec?.pageIds ?? [];
  },
});

export const push = mutation({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const rec = await ctx.db.query("recents").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    const pageIds = [args.pageId, ...(rec?.pageIds ?? []).filter((id: string) => id !== args.pageId)].slice(0, 8);
    if (rec) {
      await ctx.db.patch(rec._id, { pageIds });
    } else {
      await ctx.db.insert("recents", { userId, pageIds });
    }
  },
});
