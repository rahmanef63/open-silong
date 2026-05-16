import { internalMutation } from "./_generated/server";

const ONE_DAY_MS = 24 * 60 * 60_000;
const TRASH_TTL_MS = 30 * ONE_DAY_MS;

/** Daily prune of expired rate-limit windows. Uses `by_window` index
 *  range scan — cron processes only rows older than 24h, no full scan. */
export const pruneRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ONE_DAY_MS;
    const old = await ctx.db
      .query("rateLimits")
      .withIndex("by_window", (q) => q.lt("windowStart", cutoff))
      .collect();
    for (const row of old) await ctx.db.delete(row._id);
    return { pruned: old.length };
  },
});

/** Permanently delete pages + databases whose `trashed === true` and
 *  last `updatedAt` is older than 30 days. Mirrors `pages.permanently
 *  Delete` / `databases.permanentlyDeleteDatabase` (also drops
 *  associated snapshots). Trash is a soft-delete UX; this gives users
 *  30 days to restore before storage gets reclaimed.
 *
 *  Uses `by_trashed_updated` range index — only scans `(trashed=true,
 *  updatedAt < cutoff)`. */
export const purgeStaleTrash = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - TRASH_TTL_MS;
    const staleTrashedPages = await ctx.db
      .query("pages")
      .withIndex("by_trashed_updated", (q) =>
        q.eq("trashed", true).lt("updatedAt", cutoff),
      )
      .collect();
    const staleTrashedDbs = await ctx.db
      .query("databases")
      .withIndex("by_trashed_updated", (q) =>
        q.eq("trashed", true).lt("updatedAt", cutoff),
      )
      .collect();
    let snaps = 0;
    for (const p of staleTrashedPages) {
      const ss = await ctx.db
        .query("snapshots")
        .withIndex("by_user_page", (q) => q.eq("userId", p.userId).eq("pageId", p._id))
        .collect();
      for (const s of ss) {
        await ctx.db.delete(s._id);
        snaps++;
      }
      await ctx.db.delete(p._id);
    }
    for (const d of staleTrashedDbs) await ctx.db.delete(d._id);
    return { pages: staleTrashedPages.length, snaps, dbs: staleTrashedDbs.length };
  },
});
