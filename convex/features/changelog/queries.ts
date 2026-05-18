import { query } from "../../_generated/server";
import { requireAdminQuery } from "../../_shared/auth";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Admin: list every entry (drafts + published), most recent first. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminQuery(ctx);
    const rows = await ctx.db
      .query("changelogEntries")
      .withIndex("by_created")
      .order("desc")
      .take(100);
    return rows;
  },
});

/** Public: list published entries, most recent first. Used by inbox +
 *  any "What's new" page. */
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("changelogEntries")
      .withIndex("by_published")
      .order("desc")
      .take(50);
    return rows.filter((r) => r.publishedAt != null);
  },
});

/** Unread count for inbox badge — published entries newer than the
 *  viewer's lastReadChangelogAt. */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const since = profile?.lastReadChangelogAt ?? 0;
    const rows = await ctx.db
      .query("changelogEntries")
      .withIndex("by_published")
      .order("desc")
      .take(50);
    return rows.filter((r) => r.publishedAt != null && r.publishedAt > since).length;
  },
});

/** Public: list published entries unread by the viewer. Used by the
 *  inbox surface to merge changelog rows in with regular notifications. */
export const listUnread = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const since = profile?.lastReadChangelogAt ?? 0;
    const rows = await ctx.db
      .query("changelogEntries")
      .withIndex("by_published")
      .order("desc")
      .take(50);
    return rows.filter((r) => r.publishedAt != null && r.publishedAt > since);
  },
});
