import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { rateLimit, type RateLimitConfig } from "../_shared/rateLimit";
import { requireAuth, requireAdmin } from "../_shared/auth";
import { RATE_LIMITS } from "../_shared/limits";
import {
  checkAiTokenQuota,
  recordAiTokenUsage,
  readAiTokenUsage,
} from "../_shared/aiQuota";

/** Internal — upsert the in-flight run's progress doc. Called from
 *  chat.complete after each hop / tool dispatch so the frontend can
 *  subscribe and render a live timeline. */
export const writeProgress = internalMutation({
  args: { runId: v.string(), userId: v.id("users"), steps: v.array(v.any()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiRunProgress")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .first();
    const patch = { userId: args.userId, runId: args.runId, steps: args.steps, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("aiRunProgress", patch);
  },
});

/** Internal — clear the progress doc after the action returns. Best
 *  effort; orphans are cleaned by the daily prune cron. */
export const clearProgress = internalMutation({
  args: { runId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiRunProgress")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/** Called from ai.complete action (which can't touch ctx.db directly).
 *  Enforces THREE gates: per-hour call burst + per-day call ceiling +
 *  per-day token quota. Any failure throws and the action aborts before
 *  any upstream LLM byte is paid for. */
export const checkRateLimit = internalMutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    await rateLimit(ctx, userId, RATE_LIMITS.aiComplete);
    await rateLimit(ctx, userId, RATE_LIMITS.aiCompleteDay);
    await checkAiTokenQuota(ctx, userId);
  },
});

/** Called from ai.complete AFTER each successful upstream call so the
 *  token ledger reflects spend immediately — next call inside the same
 *  action loop already sees the bump. */
export const recordAiUsage = internalMutation({
  args: { tokens: v.number() },
  handler: async (ctx, { tokens }) => {
    const userId = await requireAuth(ctx);
    await recordAiTokenUsage(ctx, userId, tokens);
  },
});

/** Read-only — for the AI console quota meter / admin overview. */
export const getMyAiUsage = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => readAiTokenUsage(ctx, userId),
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
