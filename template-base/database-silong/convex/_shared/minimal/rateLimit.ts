/**
 * Minimal-mode rate-limit stub.
 *
 *  Noop. Use when your consumer project doesn't need per-user / per-
 *  scope throttling (or handles it at a different layer, e.g. CDN or
 *  WAF).
 *
 *  Full mode: `_shared/full/rateLimit.ts` requires a `rateLimits`
 *  table for tracking. See schema.database-silong.ts for the table
 *  shape (optional — not shipped by default).
 */

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function rateLimit(
  _ctx: MutationCtx,
  _userId: Id<"users">,
  _opts: { scope: string; max: number; windowMs: number },
): Promise<void> {
  // Noop.
}
