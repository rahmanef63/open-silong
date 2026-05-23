/**
 * AI key resolver — fallback chain used by every AI action.
 *
 * Order (per call, per provider, per workspace):
 *   1. User's PERSONAL key for `provider` (if `preferOwn=true`)
 *   2. Workspace SHARED key for `provider` (if any member added one)
 *   3. globalAISettings admin key (existing path) or
 *      `process.env.<PROVIDER>_API_KEY` env var
 *
 * Returns plaintext + `source` tier so the caller writes
 * `aiUsageLog.keySource` for cost attribution. Plaintext NEVER
 * crosses back to the client — only the key id / source label.
 */

import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { decryptApiKey } from "./aiCrypto";
import { api } from "../_generated/api";

export type Provider = "openai" | "anthropic" | "google" | "openrouter" | "custom";
export type KeySource = "user" | "workspace" | "admin";

export interface ResolvedKey {
  plaintext: string;
  source: KeySource;
  endpoint?: string;
  /** Row id of the resolved aiUserKeys row (null when source=admin). */
  keyId: Id<"aiUserKeys"> | null;
  /** Creator of the key (when source=workspace). */
  keyOwnerUserId: Id<"users"> | null;
  /** Provider name passed back for action logging convenience. */
  provider: Provider;
}

interface ResolveArgs {
  userId: Id<"users">;
  workspaceId: Id<"workspaces">;
  provider: Provider;
}

const ADMIN_ENV: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_AI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  custom: "CUSTOM_AI_API_KEY",
};

export async function resolveAiKey(
  ctx: ActionCtx,
  args: ResolveArgs,
): Promise<ResolvedKey> {
  const candidates = await ctx.runQuery(api.aiKeys.list.forResolver, {
    userId: args.userId,
    workspaceId: args.workspaceId,
    provider: args.provider,
  });

  // Tier 1 — personal key with preferOwn
  const personal = candidates.find(
    (k) => k.scope === "personal"
      && k.ownerUserId === args.userId
      && k.preferOwn,
  );
  if (personal) {
    return {
      plaintext: await decryptApiKey(personal.encryptedKey),
      source: "user",
      endpoint: personal.endpoint,
      keyId: personal._id,
      keyOwnerUserId: args.userId,
      provider: args.provider,
    };
  }

  // Tier 2 — workspace shared key (oldest first; per-call user picker
  // when multiple shared keys exist comes in PR3)
  const shared = candidates.find((k) => k.scope === "workspace");
  if (shared) {
    return {
      plaintext: await decryptApiKey(shared.encryptedKey),
      source: "workspace",
      endpoint: shared.endpoint,
      keyId: shared._id,
      keyOwnerUserId: shared.ownerUserId,
      provider: args.provider,
    };
  }

  // Tier 3 — env-var admin fallback (in addition to globalAISettings
  // which has its own admin-managed row; both work as "admin" source)
  const envKey = process.env[ADMIN_ENV[args.provider]];
  if (envKey) {
    return {
      plaintext: envKey,
      source: "admin",
      endpoint: undefined,
      keyId: null,
      keyOwnerUserId: null,
      provider: args.provider,
    };
  }

  throw new Error(
    `No AI key available for ${args.provider}. ` +
    `Add one in Settings → AI, or ask your workspace admin.`,
  );
}
