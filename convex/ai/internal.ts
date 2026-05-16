import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { rateLimit, type RateLimitConfig } from "../_shared/rateLimit";
import { requireAuth, requireAdmin } from "../_shared/auth";
import { RATE_LIMITS } from "../_shared/limits";

/** Called from ai.complete action (which can't touch ctx.db directly). */
export const checkRateLimit = internalMutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    await rateLimit(ctx, userId, RATE_LIMITS.aiComplete);
  },
});

/** Admin-scoped rate limit used by AI admin actions (test connection,
 *  list catalog). Bootstraps + asserts admin role and increments the
 *  named bucket in one round-trip. */
export const checkAdminRateLimit = internalMutation({
  args: {
    scope: v.string(),
    max: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);
    const cfg: RateLimitConfig = { scope: args.scope, max: args.max, windowMs: args.windowMs };
    await rateLimit(ctx, adminId, cfg);
  },
});
