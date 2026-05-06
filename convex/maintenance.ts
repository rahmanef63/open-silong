import { internalMutation } from "./_generated/server";

const ONE_DAY_MS = 24 * 60 * 60_000;

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
