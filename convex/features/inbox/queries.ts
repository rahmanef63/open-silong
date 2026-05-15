import { query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readActiveWorkspace, rowInActiveWorkspace } from "../../_shared/workspace";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return [];
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return rows.filter((r) => rowInActiveWorkspace(r, active, userId));
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return 0;
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("read", false))
      .collect();
    return items.filter((r) => rowInActiveWorkspace(r, active, userId)).length;
  },
});
