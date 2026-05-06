import { internalMutation } from "../_generated/server";
import { rateLimit } from "../_shared/rateLimit";
import { requireAuth } from "../_shared/auth";

/** Called from ai.complete action (which can't touch ctx.db directly). */
export const checkRateLimit = internalMutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    // 20 calls / hour / user. Tune later via dashboard.
    await rateLimit(ctx, userId, { scope: "ai.complete", max: 20, windowMs: 60 * 60_000 });
  },
});
