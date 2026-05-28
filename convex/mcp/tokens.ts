/** Per-user MCP tokens — multi-tenant access without sharing the env-
 *  baked single-tenant token. Plaintext is shown ONCE on issue; only
 *  sha256(token) is persisted. http.ts looks tokens up by hash. */

import { v } from "convex/values";
import {
  mutation, query, internalMutation, internalQuery,
} from "../_generated/server";
import { requireAuth } from "../_shared/auth";
import { sha256Hex, generateMcpToken } from "../_shared/hash";
import { COUNT_CAPS } from "../_shared/limits";

const MAX_TOKENS_PER_USER = 10;

export const issue = mutation({
  args: { label: v.string() },
  handler: async (ctx, { label }) => {
    const userId = await requireAuth(ctx);
    const trimmed = label.trim().slice(0, 60) || "Untitled";

    const existing = await ctx.db
      .query("mcpTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(COUNT_CAPS.mcpTokensScan);
    const live = existing.filter((t) => !t.revoked).length;
    if (live >= MAX_TOKENS_PER_USER) {
      throw new Error(`Maks ${MAX_TOKENS_PER_USER} token aktif per user`);
    }

    const token = generateMcpToken();
    const tokenHash = await sha256Hex(token);
    const id = await ctx.db.insert("mcpTokens", {
      userId,
      tokenHash,
      label: trimmed,
      createdAt: Date.now(),
      revoked: false,
    });
    return { id, token, label: trimmed };
  },
});

export const revoke = mutation({
  args: { tokenId: v.id("mcpTokens") },
  handler: async (ctx, { tokenId }) => {
    const userId = await requireAuth(ctx);
    const t = await ctx.db.get(tokenId);
    if (!t || t.userId !== userId) throw new Error("Token tidak ditemukan");
    if (t.revoked) return { ok: true };
    await ctx.db.patch(tokenId, { revoked: true });
    return { ok: true };
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const rows = await ctx.db
      .query("mcpTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(COUNT_CAPS.mcpTokensScan);
    return rows
      .map((r) => ({
        id: r._id,
        label: r.label,
        createdAt: r.createdAt,
        lastUsedAt: r.lastUsedAt,
        revoked: r.revoked,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const lookupByHash = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const t = await ctx.db
      .query("mcpTokens")
      .withIndex("by_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();
    if (!t || t.revoked) return null;
    return { id: t._id, userId: t.userId };
  },
});

export const touchLastUsed = internalMutation({
  args: { tokenId: v.id("mcpTokens") },
  handler: async (ctx, { tokenId }) => {
    await ctx.db.patch(tokenId, { lastUsedAt: Date.now() });
    return { ok: true };
  },
});
