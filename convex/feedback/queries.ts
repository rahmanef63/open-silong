import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdminQuery } from "../_shared/auth";

export const listFeedback = query({
  args: { status: v.optional(v.union(v.literal("open"), v.literal("resolved"), v.literal("all"))) },
  handler: async (ctx, { status }) => {
    await requireAdminQuery(ctx);
    const which = status ?? "open";
    if (which === "all") {
      return await ctx.db.query("feedbackEntries").order("desc").take(200);
    }
    return await ctx.db
      .query("feedbackEntries")
      .withIndex("by_status", (q) => q.eq("status", which))
      .order("desc")
      .take(200);
  },
});
