/** Save a BYOK AI key. Plaintext key arrives in the action arg,
 *  is encrypted via the existing `aiCrypto` envelope, and persisted.
 *  Workspace-scoped keys require workspace admin membership. */

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { encryptApiKey } from "../_shared/aiCrypto";

const providerValidator = v.union(
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("google"),
  v.literal("openrouter"),
  v.literal("custom"),
);

const modelValidator = v.object({
  id: v.string(),
  label: v.string(),
  enabled: v.boolean(),
});

function last4(plain: string): string {
  const s = plain.trim();
  if (s.length <= 4) return "•".repeat(s.length);
  return `…${s.slice(-4)}`;
}

export const save = action({
  args: {
    /** When updating an existing key, pass its id. Omit to create. */
    id: v.optional(v.id("aiUserKeys")),
    scope: v.union(v.literal("personal"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    provider: providerValidator,
    /** Plaintext API key. Encrypted server-side before write; never
     *  stored or logged in plaintext. */
    plaintextKey: v.string(),
    endpoint: v.optional(v.string()),
    label: v.optional(v.string()),
    enabledModels: v.array(modelValidator),
    preferOwn: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    if (args.scope === "workspace" && !args.workspaceId) {
      throw new Error("workspaceId required for scope=workspace");
    }

    // Encrypt + compute display hint. Never persist plaintext.
    const encryptedKey = await encryptApiKey(args.plaintextKey);
    const tail = last4(args.plaintextKey);
    const now = Date.now();

    if (args.id) {
      // Update path — confirm ownership before mutating.
      await ctx.runMutation(api.aiKeys.write.upsertExisting, {
        id: args.id,
        encryptedKey,
        last4: tail,
        endpoint: args.endpoint,
        label: args.label,
        enabledModels: args.enabledModels,
        preferOwn: args.preferOwn,
        scope: args.scope,
        workspaceId: args.workspaceId,
        provider: args.provider,
        userId,
        now,
      });
      return { id: args.id, last4: tail };
    }

    // Create path
    const id = await ctx.runMutation(api.aiKeys.write.insertNew, {
      ownerUserId: userId,
      scope: args.scope,
      workspaceId: args.workspaceId,
      provider: args.provider,
      label: args.label,
      encryptedKey,
      last4: tail,
      endpoint: args.endpoint,
      enabledModels: args.enabledModels,
      preferOwn: args.preferOwn,
      now,
    });
    return { id, last4: tail };
  },
});
