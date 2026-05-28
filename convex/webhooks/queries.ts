import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { COUNT_CAPS } from "../_shared/limits";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("webhookEndpoints")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(COUNT_CAPS.webhookEndpointsScan);
    // Strip `secret` — only shown once at create-time.
    return rows.map((r) => ({
      id: r._id,
      url: r.url,
      events: r.events,
      enabled: r.enabled,
      createdAt: r.createdAt,
      lastSuccessAt: r.lastSuccessAt ?? null,
      lastErrorAt: r.lastErrorAt ?? null,
      lastError: r.lastError ?? null,
    }));
  },
});
