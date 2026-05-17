import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdminQuery } from "../_shared/auth";

const STATUS_FILTER = v.union(
  v.literal("open"),
  v.literal("in_review"),
  v.literal("resolved"),
  v.literal("closed"),
  v.literal("all"),
);

export const listFeedback = query({
  args: { status: v.optional(STATUS_FILTER) },
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

/** User-side: list tickets I submitted. Returns most recent first.
 *  Empty array when unauthenticated (same defensive default as the
 *  rest of `_shared/auth` reads). */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("feedbackEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
  },
});
