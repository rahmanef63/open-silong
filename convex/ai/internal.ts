import { internalMutation } from "../_generated/server";
import { rateLimit } from "../_shared/rateLimit";
import { requireAuth } from "../_shared/auth";
import { RATE_LIMITS } from "../_shared/limits";

/** Called from ai.complete action (which can't touch ctx.db directly). */
export const checkRateLimit = internalMutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    await rateLimit(ctx, userId, RATE_LIMITS.aiComplete);
  },
});
