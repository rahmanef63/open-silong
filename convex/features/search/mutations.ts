import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { buildSearchText } from "./lib";

/** One-shot: backfill `searchText` on all pages owned by the given user.
 *  Internal — caller is a migration script, not a logged-in client.
 *  Idempotent — recomputes regardless of existing value. */
export const backfillSearchText = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
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
