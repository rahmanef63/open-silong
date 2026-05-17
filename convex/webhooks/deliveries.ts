/** Read-only deliveries log query for the Webhooks settings UI.
 *  Owner-scoped — ensures viewer owns the endpoint before exposing
 *  delivery history. Capped at 50 most-recent attempts. */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const MAX_DELIVERIES = 50;

export const listForEndpoint = query({
  args: { endpointId: v.id("webhookEndpoints") },
  handler: async (ctx, { endpointId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const ep = await ctx.db.get(endpointId);
    if (!ep || ep.userId !== userId) return [];
    const rows = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_endpoint", (q) => q.eq("endpointId", endpointId))
      .take(MAX_DELIVERIES);
    return rows
      .sort((a, b) => b.attemptedAt - a.attemptedAt)
      .map((r) => ({
        id: r._id,
        event: r.event,
        attemptedAt: r.attemptedAt,
        statusCode: r.statusCode ?? null,
        error: r.error ?? null,
      }));
  },
});
