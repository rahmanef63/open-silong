/** Read receipts for pages.
 *
 *  `touch` is called by the client on PageEditor mount + every ~30s
 *  while focused (client-side debounced). `recentViewers` powers the
 *  "Seen by N" badge — returns viewer list (excluding the viewer
 *  themselves) sorted by lastViewedAt desc, capped at 20.
 *
 *  Both mutations gate via `requireOwned("pages", pageId)` so only
 *  viewers with read access to the page can touch / list receipts.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

const MAX_RECENT_VIEWERS = 20;

export const touch = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false };
    const page = await ctx.db.get(pageId);
    if (!page) return { ok: false };
    // Read-access check: page is shared OR owned by viewer.
    if (page.userId !== userId && !page.isPublic) return { ok: false };
    const existing = await ctx.db
      .query("pageViews")
      .withIndex("by_page_user", (q) => q.eq("pageId", pageId).eq("userId", userId))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { lastViewedAt: now });
    } else {
      await ctx.db.insert("pageViews", { userId, pageId, lastViewedAt: now });
    }
    return { ok: true };
  },
});

export const recentViewers = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const viewerId = await getAuthUserId(ctx);
    if (!viewerId) return [];
    const page = await ctx.db.get(pageId);
    if (!page) return [];
    if (page.userId !== viewerId && !page.isPublic) return [];
    const rows = await ctx.db
      .query("pageViews")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .take(MAX_RECENT_VIEWERS * 2);
    // Sort + dedupe (one row per user via by_page_user uniqueness, but
    // defensive in case of legacy double-rows from a pre-index race).
    const seen = new Set<string>();
    const sorted = rows
      .filter((r) => r.userId !== viewerId)
      .sort((a, b) => b.lastViewedAt - a.lastViewedAt)
      .filter((r) => {
        if (seen.has(String(r.userId))) return false;
        seen.add(String(r.userId));
        return true;
      })
      .slice(0, MAX_RECENT_VIEWERS);
    const enriched = await Promise.all(
      sorted.map(async (r) => {
        const u = await ctx.db.get(r.userId as Id<"users">);
        return {
          userId: r.userId,
          name: (u?.name as string | undefined) ?? "Someone",
          image: (u?.image as string | undefined) ?? null,
          lastViewedAt: r.lastViewedAt,
        };
      }),
    );
    return enriched;
  },
});
