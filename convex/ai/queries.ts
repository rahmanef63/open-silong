import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { requireAdminQuery } from "../_shared/auth";
import { listProvidersPublic } from "../_shared/aiProviders";
import { decryptApiKey, isEncryptedApiKey } from "../_shared/aiCrypto";
import { COUNT_CAPS } from "../_shared/limits";

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
 *  masked key preview). Returns null when not yet set. Mask is computed
 *  from the DECRYPTED key so the preview is meaningful regardless of
 *  whether the stored value is enveloped or legacy plaintext. */
export const getGlobalAISettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminQuery(ctx);
    const row = await ctx.db.query("globalAISettings").first();
    if (!row) return null;
    let plain = "";
    try {
      plain = await decryptApiKey(row.apiKey);
    } catch {
      // Encrypted but secret missing/wrong — admin still gets to see the
      // config but the preview is replaced with a diagnostic placeholder.
      plain = "";
    }
    return {
      provider: row.provider,
      model: row.model,
      baseUrl: row.baseUrl ?? null,
      enabled: row.enabled,
      hasKey: row.apiKey.length > 0,
      keyPreview: plain ? maskKey(plain) : (row.apiKey.length > 0 ? "🔒 encrypted (no secret loaded)" : ""),
      encrypted: isEncryptedApiKey(row.apiKey),
      updatedAt: row.updatedAt,
    };
  },
});

/** Internal — used by the chat resolver. Returns the live config with the
 *  DECRYPTED apiKey only when enabled + key present. Decryption errors
 *  surface to the action so it can produce an actionable message. */
export const _getGlobalAISettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("globalAISettings").first();
    if (!row || !row.enabled || !row.apiKey) return null;
    const apiKey = await decryptApiKey(row.apiKey);
    return {
      provider: row.provider,
      model: row.model,
      apiKey,
      baseUrl: row.baseUrl ?? null,
    };
  },
});

/** Internal — diagnostic. Tells the resolver whether the row exists and
 *  why `_getGlobalAISettings` returned null, so error messages can point
 *  at the exact missing piece (no row vs disabled vs no key). */
export const _probeGlobalAISettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("globalAISettings").first();
    if (!row) return { exists: false, enabled: false, hasKey: false };
    return {
      exists: true,
      enabled: !!row.enabled,
      hasKey: row.apiKey.length > 0,
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

/** Internal — used by AI actions to assert the caller is an admin. Throws
 *  on failure with the same error string as `requireAdminQuery`. Actions
 *  cannot touch ctx.db directly, so this query is the gate. */
export const _requireAdminFromAction = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdminQuery(ctx);
    return true;
  },
});

/** Admin — all model overrides with user email + name for the table UI.
 *  Capped via `COUNT_CAPS.aiOverridesScan`; if you hit the cap, switch
 *  to pagination. */
export const listAIOverrides = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminQuery(ctx);
    const rows = await ctx.db
      .query("aiUserModelOverrides")
      .take(COUNT_CAPS.aiOverridesScan);
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
