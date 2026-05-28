import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../_shared/auth";
import { AI_PROVIDERS } from "../_shared/aiProviders";
import { encryptApiKey } from "../_shared/aiCrypto";

/** Admin — upsert the singleton global AI config row. When `apiKey` is
 *  empty the existing key is preserved (so admin can update model/provider
 *  without re-pasting the secret). When `enabled === true`, a key is
 *  required (either pre-existing or newly supplied). */
export const setGlobalAISettings = mutation({
  args: {
    provider: v.string(),
    model: v.string(),
    apiKey: v.string(),
    baseUrl: v.optional(v.string()),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);

    const spec = AI_PROVIDERS[args.provider];
    if (!spec) throw new Error(`Unknown provider: ${args.provider}`);

    const model = args.model.trim();
    if (!model) throw new Error("Model is required");

    const rawKey = args.apiKey.trim();
    const baseUrl = args.baseUrl?.trim() || undefined;
    if (args.provider === "custom" && !baseUrl) {
      throw new Error("Custom provider requires a Base URL");
    }

    const existing = await ctx.db.query("globalAISettings").first();
    // New key supplied → encrypt before write. Blank input preserves the
    // existing stored value (encrypted or legacy plaintext — either is
    // fine, decryptApiKey passes plaintext through).
    const apiKey = rawKey
      ? await encryptApiKey(rawKey)
      : (existing?.apiKey || "");
    if (args.enabled && !apiKey) {
      throw new Error("API key is required when enabling global AI");
    }

    const patch = {
      provider: args.provider,
      model,
      apiKey,
      baseUrl,
      enabled: args.enabled,
      updatedBy: adminId,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("globalAISettings", patch);
  },
});

/** Admin — clear the global config row. After this the resolver falls
 *  back to the env var (`OPENROUTER_API_KEY`). */
export const clearGlobalAISettings = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("globalAISettings").first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/** Admin — assign a user (by email) a specific model. Inherits provider +
 *  apiKey from `globalAISettings`. Singleton-per-user (one row per
 *  userId). Used to route premium users to a beefier model on the shared
 *  key. */
export const setUserAIModelOverride = mutation({
  args: { email: v.string(), model: v.string() },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);

    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");
    const model = args.model.trim();
    if (!model) throw new Error("Model is required");

    // @convex-dev/auth's users table ships an "email" index — use it
    // instead of a full-table .filter() scan (was O(all users)).
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new Error(`No user with email ${email}`);

    const existing = await ctx.db
      .query("aiUserModelOverrides")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const patch = {
      userId: user._id,
      model,
      setBy: adminId,
      updatedAt: Date.now(),
      emailAtAssign: (user.email as string | undefined) ?? email,
      nameAtAssign: (user.name as string | undefined) ?? undefined,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("aiUserModelOverrides", patch);
    }
    return { userId: user._id, email };
  },
});

/** Admin — remove a single per-user override. */
export const clearUserAIModelOverride = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("aiUserModelOverrides")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
