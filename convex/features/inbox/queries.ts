import { query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readActiveWorkspace, rowInActiveWorkspace } from "../../_shared/workspace";
import { COUNT_CAPS } from "../../_shared/limits";

/** Most recent N notifications for the viewer, scoped to active workspace.
 *  Cap the index scan at `COUNT_CAPS.notificationScan` so users with long
 *  histories don't OOM the query. Workspace filter runs in-memory over
 *  the capped slice (the secondary index would be a bigger refactor and
 *  the cap is already tight). */
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
      .take(COUNT_CAPS.notificationScan);
    return rows.filter((r) => rowInActiveWorkspace(r, active, userId));
  },
});

/** Unread count for the inbox badge. Same cap applies — if you have
 *  >300 unread, the badge stops counting precisely (users with that
 *  many unread are not the optimization target). */
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
      .take(COUNT_CAPS.notificationScan);
    return items.filter((r) => rowInActiveWorkspace(r, active, userId)).length;
  },
});
