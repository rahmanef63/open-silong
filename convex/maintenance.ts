import { internalMutation } from "./_generated/server";

const ONE_DAY_MS = 24 * 60 * 60_000;
const TRASH_TTL_MS = 30 * ONE_DAY_MS;

export const pruneRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ONE_DAY_MS;
    // No filter index — table stays small enough that a full scan per day
    // is cheaper than maintaining a windowStart index. If the table grows
    // beyond a few thousand rows in practice, add `.index("by_window",
    // ["windowStart"])` to schema.ts and switch to withIndex(...lt cutoff).
    const old = await ctx.db.query("rateLimits").collect();
    let pruned = 0;
    for (const row of old) {
      if (row.windowStart < cutoff) {
        await ctx.db.delete(row._id);
        pruned++;
      }
    }
    return { pruned };
  },
});

/** Permanently delete pages + databases whose `trashed === true` and
 *  last `updatedAt` is older than 30 days. Mirrors `pages.permanently
 *  Delete` / `databases.permanentlyDeleteDatabase` (also drops
 *  associated snapshots). Trash is a soft-delete UX; this gives users
 *  30 days to restore before storage gets reclaimed. */
export const purgeStaleTrash = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - TRASH_TTL_MS;
    const allPages = await ctx.db.query("pages").collect();
    const allDbs = await ctx.db.query("databases").collect();
    let pages = 0;
    let snaps = 0;
    let dbs = 0;
    for (const p of allPages) {
      if (!p.trashed) continue;
      if (p.updatedAt > cutoff) continue;
      const ss = await ctx.db
        .query("snapshots")
        .withIndex("by_user_page", (q) => q.eq("userId", p.userId).eq("pageId", p._id))
        .collect();
      for (const s of ss) {
        await ctx.db.delete(s._id);
        snaps++;
      }
      await ctx.db.delete(p._id);
      pages++;
    }
    for (const d of allDbs) {
      if (!d.trashed) continue;
      if (d.updatedAt > cutoff) continue;
      await ctx.db.delete(d._id);
      dbs++;
    }
    return { pages, snaps, dbs };
  },
});
