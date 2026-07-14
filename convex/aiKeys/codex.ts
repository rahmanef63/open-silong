/** codex.ts — "Sign in with ChatGPT" (OpenAI Codex CLI) BYOK OAuth.
 *
 *  ⚠️ ToS: rides a user's ChatGPT SUBSCRIPTION via OpenAI's unofficial,
 *  reverse-engineered Codex CLI device-auth flow. Grey-area; the user
 *  explicitly opted in. GATED: the resulting key only ever fires when the
 *  user selects an `openai-codex/*` model in the AI console picker — it
 *  never touches the admin / OpenRouter / summary paths. See
 *  `_shared/codexLib.ts` for the wire protocol + more caveats.
 *
 *  Runs in the DEFAULT Convex runtime (fetch + crypto.subtle + atob are
 *  all available) — no `"use node"` needed. Actions can't touch ctx.db,
 *  so DB reads/writes hop through the internal query/mutations below.
 */

import { v } from "convex/values";
import { action, internalQuery, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { encryptApiKey, decryptApiKey } from "../_shared/aiCrypto";
import {
  CODEX,
  decodeAccountId,
  ensureFreshCodex,
  codexModels,
  type CodexBundle,
} from "../_shared/codexLib";

/** Fallback model list when the unofficial /models probe returns nothing,
 *  so the picker isn't empty right after a fresh connect. */
const DEFAULT_CODEX_MODELS = ["gpt-5", "gpt-5-codex", "codex-mini-latest"];

function enabledModelsFrom(ids: string[]) {
  const list = ids.length > 0 ? ids : DEFAULT_CODEX_MODELS;
  return list.map((id) => ({ id, label: id, enabled: true }));
}

// ─── internal flow-state helpers (DB hops for the actions) ─────────────

export const _getFlow = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("aiCodexFlows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return row ? { deviceAuthId: row.deviceAuthId, userCode: row.userCode } : null;
  },
});

export const _setFlow = internalMutation({
  args: {
    userId: v.id("users"),
    deviceAuthId: v.optional(v.string()),
    userCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiCodexFlows")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    const patch = {
      userId: args.userId,
      deviceAuthId: args.deviceAuthId,
      userCode: args.userCode,
      createdAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("aiCodexFlows", patch);
  },
});

export const _clearFlow = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("aiCodexFlows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(10);
    for (const r of rows) await ctx.db.delete(r._id);
  },
});

// ─── internal key-row helpers (used by connect + by resolveAI) ─────────

/** Read the caller's codex key row (encrypted bundle + id). Called from
 *  the chat action's `resolveAI` to decrypt + refresh the bundle. */
export const _getCodexKey = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("aiUserKeys")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .filter((q) => q.eq(q.field("provider"), "openai-codex"))
      .first();
    return row ? { _id: row._id, encryptedKey: row.encryptedKey } : null;
  },
});

/** Persist a rotated bundle (after a token refresh) onto the codex row. */
export const _storeCodexBundle = internalMutation({
  args: { keyId: v.id("aiUserKeys"), encryptedKey: v.string() },
  handler: async (ctx, { keyId, encryptedKey }) => {
    const row = await ctx.db.get(keyId);
    if (!row) return;
    await ctx.db.patch(keyId, { encryptedKey, updatedAt: Date.now() });
  },
});

/** Upsert the personal codex key row after a successful connect. */
export const _upsertCodexKey = internalMutation({
  args: {
    userId: v.id("users"),
    encryptedKey: v.string(),
    last4: v.string(),
    enabledModels: v.array(
      v.object({ id: v.string(), label: v.string(), enabled: v.boolean() }),
    ),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUserId(ctx);
    if (!me || me !== args.userId) throw new Error("Auth mismatch");
    const now = Date.now();
    const existing = await ctx.db
      .query("aiUserKeys")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", args.userId))
      .filter((q) => q.eq(q.field("provider"), "openai-codex"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedKey: args.encryptedKey,
        last4: args.last4,
        enabledModels: args.enabledModels,
        preferOwn: true,
        authMode: "oauth",
        validatedAt: now,
        validatedError: undefined,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("aiUserKeys", {
      ownerUserId: args.userId,
      scope: "personal",
      provider: "openai-codex",
      authMode: "oauth",
      label: "ChatGPT (OAuth)",
      encryptedKey: args.encryptedKey,
      last4: args.last4,
      enabledModels: args.enabledModels,
      preferOwn: true,
      validatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─── device-code OAuth actions ─────────────────────────────────────────

/** Step 1 — request a device/user code. Returns the verification URL +
 *  short user code for the user to enter at auth.openai.com. */
export const startCodexLogin = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ verificationUrl: string; userCode: string; intervalMs: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    // ToS: unofficial device-auth usercode endpoint.
    const res = await fetch(CODEX.usercodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CODEX.clientId }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`ChatGPT device auth failed (${res.status}): ${body.slice(0, 160)}`);
    }
    const j = await res.json();
    const userCode: string = j.user_code ?? j.usercode ?? "";
    const deviceAuthId: string | undefined = j.device_auth_id;
    await ctx.runMutation(internal.aiKeys.codex._setFlow, {
      userId,
      deviceAuthId,
      userCode,
    });
    const intervalMs = Math.max(3, parseInt(String(j.interval ?? "5"), 10)) * 1000;
    return { verificationUrl: CODEX.verificationUrl, userCode, intervalMs };
  },
});

/** Step 2 — poll for authorization. Called on an interval by the UI.
 *  Returns {status:"pending"} until the user approves, then exchanges the
 *  authorization code for tokens, stores the encrypted bundle, and clears
 *  the flow → {status:"done"}. */
export const pollCodexLogin = action({
  args: {},
  handler: async (ctx): Promise<{ status: "pending" | "done" }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const flow = await ctx.runQuery(internal.aiKeys.codex._getFlow, { userId });
    if (!flow?.deviceAuthId) throw new Error("No ChatGPT connect in progress — start again.");

    // ToS: unofficial device-auth token poll. 403/404 => still pending.
    const pollRes = await fetch(CODEX.pollUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_auth_id: flow.deviceAuthId,
        user_code: flow.userCode,
      }),
    });
    if (pollRes.status === 403 || pollRes.status === 404) return { status: "pending" };
    if (!pollRes.ok) {
      const body = await pollRes.text().catch(() => "");
      throw new Error(`ChatGPT poll failed (${pollRes.status}): ${body.slice(0, 160)}`);
    }
    const pj = await pollRes.json();
    const authorizationCode: string | undefined = pj.authorization_code;
    const codeVerifier: string | undefined = pj.code_verifier;
    if (!authorizationCode) return { status: "pending" };

    // ToS: exchange the device authorization code for an access/refresh pair.
    const tokRes = await fetch(CODEX.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
        redirect_uri: CODEX.deviceRedirect,
        client_id: CODEX.clientId,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      }),
    });
    if (!tokRes.ok) {
      const body = await tokRes.text().catch(() => "");
      throw new Error(`ChatGPT token exchange failed (${tokRes.status}): ${body.slice(0, 160)}`);
    }
    const tj = await tokRes.json();
    const access: string = tj.access_token;
    const accountId = decodeAccountId(access);
    const bundle: CodexBundle = {
      access,
      refresh: tj.refresh_token,
      expires: Date.now() + (tj.expires_in ?? 3600) * 1000,
      accountId,
    };

    const models = await codexModels(bundle).catch(() => [] as string[]);
    const encryptedKey = await encryptApiKey(JSON.stringify(bundle));
    const last4 = accountId ? `…${accountId.slice(-4)}` : "chat";
    await ctx.runMutation(internal.aiKeys.codex._upsertCodexKey, {
      userId,
      encryptedKey,
      last4,
      enabledModels: enabledModelsFrom(models),
    });
    await ctx.runMutation(internal.aiKeys.codex._clearFlow, { userId });
    return { status: "done" };
  },
});

/** Live model refs for the connected account, as `openai-codex/<id>`.
 *  Optional re-sync surface — the picker itself reads the stored
 *  enabledModels via `aiKeys.list.myModelRefs`. */
export const codexModelList = action({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const row = await ctx.runQuery(internal.aiKeys.codex._getCodexKey, { userId });
    if (!row) return [];
    const bundle: CodexBundle = JSON.parse(await decryptApiKey(row.encryptedKey));
    const { bundle: fresh, refreshed } = await ensureFreshCodex(bundle);
    if (refreshed) {
      await ctx.runMutation(internal.aiKeys.codex._storeCodexBundle, {
        keyId: row._id,
        encryptedKey: await encryptApiKey(JSON.stringify(fresh)),
      });
    }
    const ids = await codexModels(fresh);
    return (ids.length > 0 ? ids : DEFAULT_CODEX_MODELS).map((id) => `openai-codex/${id}`);
  },
});
