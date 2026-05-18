/** OAuth queries.
 *  - adminList: admin UI table (strips raw token from wire).
 *  - findToken: internal — used by MCP route to validate Bearer. */

import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { requireAdminQuery } from "../_shared/auth";

export const adminList = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAdminQuery(ctx);
    const rows = await ctx.db
      .query("oauthAccessTokens")
      .withIndex("by_user_time")
      .order("desc")
      .take(limit ?? 200);
    return rows.map((r) => ({
      _id: r._id,
      tokenPreview: `${r.token.slice(0, 8)}…${r.token.slice(-4)}`,
      userId: r.userId,
      clientId: r.clientId,
      scope: r.scope ?? null,
      resource: r.resource ?? null,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt ?? null,
      revokedAt: r.revokedAt ?? null,
      label: r.label ?? null,
    }));
  },
});

/** Internal — called by MCP route to resolve Bearer. Returns null if
 *  invalid/expired/revoked so caller can fall through to env fallback. */
export const findToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token || token.length < 32) return null;
    const row = await ctx.db
      .query("oauthAccessTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!row) return null;
    if (row.revokedAt) return null;
    if (row.expiresAt < Date.now()) return null;
    return {
      id: row._id,
      userId: row.userId,
      scope: row.scope ?? null,
      clientId: row.clientId,
    };
  },
});
