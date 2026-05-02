import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const defaults = {
  theme: "system",
  sidebarDensity: "comfortable",
  defaultPageSort: "manual",
  editorBehavior: "default",
  landingView: "dashboard",
  lastOpenedPageId: null as string | null,
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return defaults;
    const prefs = await ctx.db.query("preferences").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    return prefs ?? { ...defaults, userId };
  },
});

export const upsert = mutation({
  args: {
    patch: v.object({
      theme: v.optional(v.string()),
      sidebarDensity: v.optional(v.string()),
      defaultPageSort: v.optional(v.string()),
      editorBehavior: v.optional(v.string()),
      landingView: v.optional(v.string()),
      lastOpenedPageId: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.query("preferences").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, args.patch);
    } else {
      await ctx.db.insert("preferences", { userId, ...defaults, ...args.patch });
    }
  },
});
