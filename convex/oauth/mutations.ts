/** OAuth 2.1 + PKCE mutations.
 *
 *  - createCode: minted at /oauth/authorize after admin consent.
 *  - exchangeCode: redeemed at POST /api/oauth/token (single-use, PKCE-verified).
 *  - revokeToken: admin UI cabut.
 *  - touchToken: internal — bump lastUsedAt after each MCP call. */

import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { requireAdmin } from "../_shared/auth";
import { randomHex, verifyPkce } from "../_shared/pkce";

const CODE_TTL_MS = 5 * 60 * 1000;
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/** Hard allowlist of OAuth `redirect_uri` hosts. Without this, a phishing
 *  link to /oauth/authorize?redirect_uri=https://evil.com/... that the
 *  admin clicks Allow on leaks the code to evil.com — which already
 *  holds the matching PKCE code_verifier — and lets the attacker
 *  exchange for a full-admin token. Client-side check on the consent
 *  page is bypassable by calling this mutation directly with a stolen
 *  session token, so server-side is the security boundary. */
const REDIRECT_HOSTS_PROD = [
  "chatgpt.com",
  "chat.openai.com",
  "platform.openai.com",
];

/** Path-prefix allowlist per host. Pinning to known OAuth-callback paths
 *  blocks the bounce-through-open-redirect class of attacks. Update
 *  cautiously when ChatGPT/OpenAI add new connector callback paths. */
const ALLOWED_PATH_PREFIXES = ["/aip/", "/connector/", "/backend-api/", "/oauth/"];

const isAllowedRedirect = (raw: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.username || parsed.password) return false;
  if (parsed.hash) return false;
  if (parsed.protocol === "http:" && parsed.hostname === "localhost") return true;
  if (parsed.protocol !== "https:") return false;
  const hostOk = REDIRECT_HOSTS_PROD.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith("." + host),
  );
  if (!hostOk) return false;
  const path = parsed.pathname || "/";
  return ALLOWED_PATH_PREFIXES.some((p) => path === p || path.startsWith(p));
};

export const createCode = mutation({
  args: {
    codeChallenge: v.string(),
    codeChallengeMethod: v.string(),
    redirectUri: v.string(),
    clientId: v.string(),
    scope: v.optional(v.string()),
    resource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    if (args.codeChallengeMethod !== "S256") {
      throw new Error("Only S256 PKCE method is supported");
    }
    if (!args.codeChallenge || args.codeChallenge.length < 43) {
      throw new Error("Invalid code_challenge");
    }
    if (!isAllowedRedirect(args.redirectUri)) {
      throw new Error(
        `redirect_uri host not allowed (${args.redirectUri}). Only chatgpt.com / chat.openai.com / platform.openai.com accepted.`,
      );
    }
    if (!args.clientId || args.clientId.length > 200) {
      throw new Error("Invalid client_id");
    }
    const code = randomHex(32);
    await ctx.db.insert("oauthCodes", {
      code,
      codeChallenge: args.codeChallenge,
      codeChallengeMethod: args.codeChallengeMethod,
      redirectUri: args.redirectUri,
      clientId: args.clientId,
      scope: args.scope,
      resource: args.resource,
      userId,
      expiresAt: Date.now() + CODE_TTL_MS,
      consumed: false,
      createdAt: Date.now(),
    });
    return { code };
  },
});

export const exchangeCode = mutation({
  args: {
    code: v.string(),
    codeVerifier: v.string(),
    redirectUri: v.string(),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("oauthCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    /** Failure modes collapse to one opaque message so a captured-but-
     *  failed exchange can't distinguish "unknown code" vs "consumed" vs
     *  "expired" vs "PKCE mismatch" at the wire. Specific reasons go
     *  to Convex stderr for server-side debugging. */
    const GENERIC = "invalid_grant: code invalid";
    if (!row) {
      console.warn("oauth.exchangeCode rejected: unknown code");
      throw new Error(GENERIC);
    }
    if (row.consumed) {
      console.warn("oauth.exchangeCode rejected: code already used", row._id);
      throw new Error(GENERIC);
    }
    if (row.expiresAt < Date.now()) {
      console.warn("oauth.exchangeCode rejected: code expired", row._id);
      throw new Error(GENERIC);
    }
    if (row.redirectUri !== args.redirectUri) {
      console.warn("oauth.exchangeCode rejected: redirect_uri mismatch", row._id);
      throw new Error(GENERIC);
    }
    if (row.clientId !== args.clientId) {
      console.warn("oauth.exchangeCode rejected: client_id mismatch", row._id);
      throw new Error(GENERIC);
    }
    const ok = await verifyPkce(
      args.codeVerifier,
      row.codeChallenge,
      row.codeChallengeMethod,
    );
    if (!ok) {
      console.warn("oauth.exchangeCode rejected: PKCE mismatch", row._id);
      throw new Error(GENERIC);
    }

    // Mark consumed BEFORE minting so a retry can't double-issue.
    await ctx.db.patch(row._id, { consumed: true });

    const token = randomHex(32);
    const now = Date.now();
    await ctx.db.insert("oauthAccessTokens", {
      token,
      userId: row.userId,
      clientId: row.clientId,
      scope: row.scope,
      resource: row.resource,
      expiresAt: now + TOKEN_TTL_MS,
      createdAt: now,
      label: `ChatGPT · ${row.clientId}`,
    });

    return {
      access_token: token,
      token_type: "Bearer",
      expires_in: Math.floor(TOKEN_TTL_MS / 1000),
      scope: row.scope ?? undefined,
    };
  },
});

export const revokeToken = mutation({
  args: { id: v.id("oauthAccessTokens") },
  handler: async (ctx, { id }) => {
    const actorId = await requireAdmin(ctx);
    const row = await ctx.db.get(id);
    await ctx.db.patch(id, { revokedAt: Date.now() });
    try {
      await ctx.db.insert("auditLog", {
        actorId,
        kind: "oauth.revokeToken",
        target: id,
        meta: { clientId: row?.clientId, label: row?.label },
        createdAt: Date.now(),
      });
    } catch {
      // audit insert is best-effort
    }
    return { success: true };
  },
});

export const touchToken = internalMutation({
  args: { id: v.id("oauthAccessTokens") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { lastUsedAt: Date.now() });
    return { success: true };
  },
});
