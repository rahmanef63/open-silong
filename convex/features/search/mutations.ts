import { mutation } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { buildSearchText } from "./lib";

/** One-shot: backfill `searchText` on all pages owned by the calling user.
 *  Idempotent — recomputes regardless of existing value. Run once per user
 *  after the searchText field was added; subsequent writes maintain it. */
export const backfillSearchText = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { updated: 0 };
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    let updated = 0;
    for (const p of pages) {
      const next = buildSearchText(p.title, p.blocks);
      if (next !== p.searchText) {
        await ctx.db.patch(p._id, { searchText: next });
        updated++;
      }
    }
    return { updated, total: pages.length };
  },
});
