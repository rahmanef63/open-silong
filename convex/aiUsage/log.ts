/** AI usage logger. Server actions call `logUsage` after every
 *  successful provider call so Settings → Usage and Admin → AI Usage
 *  have data to render. Cost estimate uses a hardcoded price table
 *  (refreshed manually quarterly); good enough for transparency. */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

const sourceValidator = v.union(
  v.literal("user"),
  v.literal("workspace"),
  v.literal("admin"),
);

/** USD per 1k tokens (input, output). Updated quarterly. Keep
 *  conservative — UI shows "estimate". Unknown model → 0 cost. */
const PRICING: Record<string, { in: number; out: number }> = {
  "gpt-4o":             { in: 0.005,  out: 0.015 },
  "gpt-4o-mini":        { in: 0.00015, out: 0.0006 },
  "gpt-4-turbo":        { in: 0.01,   out: 0.03 },
  "claude-3-5-sonnet":  { in: 0.003,  out: 0.015 },
  "claude-3-5-haiku":   { in: 0.0008, out: 0.004 },
  "claude-3-opus":      { in: 0.015,  out: 0.075 },
  "gemini-1.5-pro":     { in: 0.00125, out: 0.005 },
  "gemini-1.5-flash":   { in: 0.000075, out: 0.0003 },
};

export function estimateCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (tokensIn / 1000) * p.in + (tokensOut / 1000) * p.out;
}

export const logUsage = mutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    provider: v.string(),
    model: v.string(),
    keySource: sourceValidator,
    keyId: v.optional(v.id("aiUserKeys")),
    keyOwnerUserId: v.optional(v.id("users")),
    tokensInput: v.number(),
    tokensOutput: v.number(),
    feature: v.string(),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    const costEstimateUsd = estimateCostUsd(
      args.model, args.tokensInput, args.tokensOutput,
    );
    await ctx.db.insert("aiUsageLog", {
      userId: args.userId,
      workspaceId: args.workspaceId,
      provider: args.provider,
      model: args.model,
      keySource: args.keySource,
      keyId: args.keyId,
      keyOwnerUserId: args.keyOwnerUserId,
      tokensInput: args.tokensInput,
      tokensOutput: args.tokensOutput,
      costEstimateUsd,
      feature: args.feature,
      durationMs: args.durationMs,
      timestamp: Date.now(),
    });
  },
});

interface UsageRow { tokensIn: number; tokensOut: number; costUsd: number; calls: number }

function accumulate(
  rows: Array<{ tokensInput: number; tokensOutput: number; costEstimateUsd: number }>,
): UsageRow {
  return rows.reduce<UsageRow>(
    (a, r) => ({
      tokensIn: a.tokensIn + r.tokensInput,
      tokensOut: a.tokensOut + r.tokensOutput,
      costUsd: a.costUsd + r.costEstimateUsd,
      calls: a.calls + 1,
    }),
    { tokensIn: 0, tokensOut: 0, costUsd: 0, calls: 0 },
  );
}

/** Current user's last-30-day usage rollup. Drives Settings → AI →
 *  Usage tab. */
export const myUsage = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const days = args.days ?? 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("aiUsageLog")
      .withIndex("by_user_time", (q) => q.eq("userId", userId).gte("timestamp", since))
      .take(5000);
    const totals = accumulate(rows);
    const byFeature = new Map<string, UsageRow>();
    const byModel = new Map<string, UsageRow>();
    const bySource = new Map<string, UsageRow>();
    for (const r of rows) {
      const f = byFeature.get(r.feature) ?? { tokensIn: 0, tokensOut: 0, costUsd: 0, calls: 0 };
      f.tokensIn += r.tokensInput; f.tokensOut += r.tokensOutput;
      f.costUsd += r.costEstimateUsd; f.calls += 1;
      byFeature.set(r.feature, f);
      const m = byModel.get(r.model) ?? { tokensIn: 0, tokensOut: 0, costUsd: 0, calls: 0 };
      m.tokensIn += r.tokensInput; m.tokensOut += r.tokensOutput;
      m.costUsd += r.costEstimateUsd; m.calls += 1;
      byModel.set(r.model, m);
      const s = bySource.get(r.keySource) ?? { tokensIn: 0, tokensOut: 0, costUsd: 0, calls: 0 };
      s.tokensIn += r.tokensInput; s.tokensOut += r.tokensOutput;
      s.costUsd += r.costEstimateUsd; s.calls += 1;
      bySource.set(r.keySource, s);
    }
    return {
      since,
      totals,
      byFeature: Object.fromEntries(byFeature),
      byModel: Object.fromEntries(byModel),
      bySource: Object.fromEntries(bySource),
    };
  },
});

/** Workspace usage rollup for admin panel. Caller asserts admin. */
export const workspaceUsage = query({
  args: { workspaceId: v.id("workspaces"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("aiUsageLog")
      .withIndex("by_workspace_time", (q) =>
        q.eq("workspaceId", args.workspaceId).gte("timestamp", since))
      .take(10000);
    const totals = accumulate(rows);
    const byUser = new Map<Id<"users">, UsageRow>();
    for (const r of rows) {
      const u = byUser.get(r.userId) ?? { tokensIn: 0, tokensOut: 0, costUsd: 0, calls: 0 };
      u.tokensIn += r.tokensInput; u.tokensOut += r.tokensOutput;
      u.costUsd += r.costEstimateUsd; u.calls += 1;
      byUser.set(r.userId, u);
    }
    return {
      since,
      totals,
      byUser: Array.from(byUser.entries()).map(([userId, agg]) => ({ userId, ...agg })),
    };
  },
});
