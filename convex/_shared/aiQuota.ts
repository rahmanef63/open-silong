/** Per-user daily AI token quota — cost-attack defense.
 *
 *  Bucketed by `dayKey` (floor(now / 86_400_000)) so window resets at
 *  UTC midnight. Token counts are prompt+completion summed across all
 *  hops of all calls in the day.
 *
 *  Check BEFORE invoking the upstream — `checkAiTokenQuota` throws when
 *  the user is already over budget. Record AFTER each completed call
 *  via `recordAiTokenUsage`. */

import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { AI_QUOTA } from "./limits";

const DAY_MS = 24 * 60 * 60_000;

export const dayKey = (now = Date.now()): number => Math.floor(now / DAY_MS);

export function dailyTokenCap(): number {
  const raw = process.env[AI_QUOTA.envKey];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : AI_QUOTA.defaultDailyTokens;
}

async function readUsage(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  day: number,
) {
  return await ctx.db
    .query("aiTokenUsage")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("dayKey", day))
    .unique();
}

/** Throws when the caller is already at/over their daily token cap. */
export async function checkAiTokenQuota(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const cap = dailyTokenCap();
  const row = await readUsage(ctx, userId, dayKey());
  if (row && row.tokens >= cap) {
    const resetMin = Math.ceil((DAY_MS - (Date.now() % DAY_MS)) / 60_000);
    throw new Error(
      `AI daily token quota exceeded (${row.tokens.toLocaleString()} / ${cap.toLocaleString()}). Reset in ~${resetMin} min.`,
    );
  }
}

/** Increment the user's daily usage. No-op for non-positive deltas. */
export async function recordAiTokenUsage(
  ctx: MutationCtx,
  userId: Id<"users">,
  tokens: number,
): Promise<void> {
  if (tokens <= 0) return;
  const day = dayKey();
  const row = await readUsage(ctx, userId, day);
  const now = Date.now();
  if (!row) {
    await ctx.db.insert("aiTokenUsage", { userId, dayKey: day, tokens, updatedAt: now });
  } else {
    await ctx.db.patch(row._id, { tokens: row.tokens + tokens, updatedAt: now });
  }
}

/** Read-only — for admin UI / user-facing quota meter. */
export async function readAiTokenUsage(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<{ used: number; cap: number; remaining: number; dayKey: number }> {
  const day = dayKey();
  const row = await readUsage(ctx, userId, day);
  const cap = dailyTokenCap();
  const used = row?.tokens ?? 0;
  return { used, cap, remaining: Math.max(0, cap - used), dayKey: day };
}
