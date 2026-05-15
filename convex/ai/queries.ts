import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { requireAdminQuery } from "../_shared/auth";
import { listProvidersPublic } from "../_shared/aiProviders";

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(Math.max(4, key.length - 8))}${key.slice(-4)}`;
}

/** Public — provider catalog for the admin model picker. No auth check
 *  needed; the catalog itself contains no secrets. */
export const listAIProviders = query({
  args: {},
  handler: async () => listProvidersPublic(),
});

/** Admin — current global AI config (provider/model/baseUrl/enabled +
 *  masked key preview). Returns null when not yet set. */
export const getGlobalAISettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminQuery(ctx);
    const row = await ctx.db.query("globalAISettings").first();
    if (!row) return null;
    return {
      provider: row.provider,
      model: row.model,
      baseUrl: row.baseUrl ?? null,
      enabled: row.enabled,
      hasKey: row.apiKey.length > 0,
      keyPreview: maskKey(row.apiKey),
      updatedAt: row.updatedAt,
    };
  },
});

/** Internal — used by the chat resolver. Returns the live config (with
 *  the unmasked apiKey) only when enabled + key present. */
export const _getGlobalAISettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("globalAISettings").first();
    if (!row || !row.enabled || !row.apiKey) return null;
    return {
      provider: row.provider,
      model: row.model,
      apiKey: row.apiKey,
      baseUrl: row.baseUrl ?? null,
    };
  },
});

/** Internal — model override for a single user (returns just the model
 *  string or null). */
export const _getUserModelOverride = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("aiUserModelOverrides")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return row?.model ?? null;
  },
});

/** Admin — all model overrides with user email + name for the table UI. */
export const listAIOverrides = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminQuery(ctx);
    const rows = await ctx.db.query("aiUserModelOverrides").collect();
    const enriched = await Promise.all(
      rows.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return {
          userId: r.userId,
          email: user?.email ?? null,
          name: user?.name ?? null,
          model: r.model,
          updatedAt: r.updatedAt,
        };
      }),
    );
    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});
