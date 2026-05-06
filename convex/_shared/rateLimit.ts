/** Fixed-window rate limiter scoped per (userId, scope).
 *
 *  Lightweight on purpose — no Convex component / cron. The bucket row is
 *  patched in-place each call; old buckets are reset on the first call of
 *  a new window. Sufficient for "stop one user spamming N times in M
 *  seconds" guards on hot mutations (comments, AI calls, page create). */

import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export interface RateLimitConfig {
  /** Max actions allowed per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Identifier for the limit, e.g. "comments.create". */
  scope: string;
}

const ERR_TOO_MANY = "Rate limit exceeded — slow down a moment.";

/** Throws Error("Rate limit exceeded …") when the user is over budget.
 *  Otherwise increments and returns. */
export async function rateLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  cfg: RateLimitConfig,
): Promise<void> {
  const now = Date.now();
  const windowStart = now - (now % cfg.windowMs);
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_scope", (q) => q.eq("userId", userId).eq("scope", cfg.scope))
    .unique();
  if (!existing) {
    await ctx.db.insert("rateLimits", { userId, scope: cfg.scope, windowStart, count: 1 });
    return;
  }
  if (existing.windowStart !== windowStart) {
    await ctx.db.patch(existing._id, { windowStart, count: 1 });
    return;
  }
  if (existing.count >= cfg.max) throw new Error(ERR_TOO_MANY);
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}
