"use node";

import { action, type ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";

import { CHAR_CAPS, RATE_LIMITS } from "../_shared/limits";
import { AI_PROVIDERS, resolveProviderBaseUrl } from "../_shared/aiProviders";

const MAX_INPUT_CHARS = CHAR_CAPS.aiInput;
const MAX_TOKENS_HARD_CAP = 4096;
/** Inline-test only allows known catalog providers. The "custom" provider
 *  has a fully attacker-controlled baseUrl when treated naively — gating
 *  it here prevents the action from being used as an outbound HTTP relay
 *  (SSRF) or as a stolen-key validation oracle for arbitrary upstreams. */
const INLINE_TEST_ALLOWED = new Set(
  Object.keys(AI_PROVIDERS).filter((id) => id !== "custom"),
);

const MessageSchema = v.object({
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  content: v.string(),
});

interface ResolvedAI {
  baseUrl: string;
  apiKey: string;
  model: string;
  source: "global" | "env" | "inline";
}

/** Resolution order:
 *  1. admin-managed `globalAISettings` (live config from the admin panel).
 *     Per-user `aiUserModelOverrides` row may swap the model field while
 *     keeping the same provider + key.
 *  2. env var `OPENROUTER_API_KEY` — original behaviour, preserved as
 *     the fallback so a fresh deploy without admin config still works.
 *     Default model + base URL pulled from `AI_PROVIDERS.openrouter`
 *     so the SSOT catalog is the only place these strings live.
 */
async function resolveAI(
  ctx: ActionCtx,
  callerOverrideModel?: string,
): Promise<ResolvedAI> {
  const userId = await getAuthUserId(ctx);

  // _getGlobalAISettings already filters out !enabled / empty key — so a
  // null result here means EITHER no row exists, OR the row exists but
  // is disabled / has no key. We need to disambiguate for the error
  // message so admin knows what to fix.
  const global = await ctx.runQuery(internal.ai.queries._getGlobalAISettings, {});
  if (global) {
    let model = global.model;
    if (userId) {
      const override = await ctx.runQuery(internal.ai.queries._getUserModelOverride, {
        userId,
      });
      if (override) model = override;
    }
    // Caller-supplied model wins over both — used by features that need
    // a specific model (e.g. summaries) regardless of the per-user pick.
    if (callerOverrideModel) model = callerOverrideModel;
    return {
      baseUrl: resolveProviderBaseUrl(global.provider, global.baseUrl ?? undefined),
      apiKey: global.apiKey,
      model,
      source: "global",
    };
  }

  const envKey = process.env.OPENROUTER_API_KEY;
  if (!envKey) {
    // Diagnose the global row state so the message is actionable.
    const probe = await ctx.runQuery(internal.ai.queries._probeGlobalAISettings, {});
    if (probe?.exists && !probe.enabled) {
      throw new Error("AI is configured but disabled — toggle Enabled in /dashboard/admin → AI and Save.");
    }
    if (probe?.exists && !probe.hasKey) {
      throw new Error("AI provider is set but the API key is missing — paste a key in /dashboard/admin → AI and Save.");
    }
    throw new Error(
      "AI not configured — set the OpenRouter key in /dashboard/admin → AI (recommended) or set OPENROUTER_API_KEY in Convex env.",
    );
  }
  const openrouter = AI_PROVIDERS.openrouter;
  return {
    baseUrl: openrouter.baseUrl,
    apiKey: envKey,
    model: callerOverrideModel ?? openrouter.defaultModel,
    source: "env",
  };
}

export const complete = action({
  args: {
    messages: v.array(MessageSchema),
    system: v.optional(v.string()),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, { messages, system, model, maxTokens }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Belum login");
    await ctx.runMutation(internal.ai.internal.checkRateLimit, {});

    if (messages.length === 0) throw new Error("Pesan kosong");

    const totalChars = messages.reduce((n, m) => n + m.content.length, 0)
      + (system?.length ?? 0);
    if (totalChars > MAX_INPUT_CHARS) {
      throw new Error(`Input terlalu besar (${totalChars} > ${MAX_INPUT_CHARS} chars)`);
    }

    const cfg = await resolveAI(ctx, model);
    const cap = Math.min(maxTokens ?? 2048, MAX_TOKENS_HARD_CAP);

    const apiMessages: { role: string; content: string }[] = [];
    if (system) apiMessages.push({ role: "system", content: system });
    else apiMessages.push({
      role: "system",
      content: "You are Nosion, a calm and concise assistant inside a Notion-like notes workspace. Reply in markdown. Be direct and helpful.",
    });
    for (const m of messages) apiMessages.push({ role: m.role, content: m.content });

    const referer = process.env.OPENROUTER_REFERER ?? "https://nosion.rahmanef.com";
    const title = process.env.OPENROUTER_APP_NAME ?? "Nosion";

    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "HTTP-Referer": referer,
        "X-Title": title,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: cap,
        messages: apiMessages,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI gateway ${res.status} (${cfg.source}): ${text.slice(0, 300)}`);
    }
    const data = await res.json() as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      model?: string;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    return {
      text,
      usage: data.usage
        ? {
            input_tokens: data.usage.prompt_tokens ?? 0,
            output_tokens: data.usage.completion_tokens ?? 0,
          }
        : null,
      model: data.model ?? cfg.model,
      source: cfg.source,
    };
  },
});

/** Admin-only — quick connectivity test from the admin AI panel. Sends a
 *  one-token "ping".
 *
 *  Security:
 *    - admin role gated via `_requireAdminFromAction` (internal query).
 *    - rate-limited per admin (`ai.admin.test`) so a compromised admin
 *      session can't be used as a credential-stuffing oracle.
 *    - inline-test (admin types a key but hasn't saved) is restricted to
 *      KNOWN catalog providers. The "custom" provider — with its
 *      admin-supplied baseUrl — must be SAVED first (which also encrypts
 *      the key at rest). This closes the SSRF / arbitrary-fetch path. */
export const testConnection = action({
  args: {
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: true; source: string; model: string; reply: string }> => {
    await ctx.runQuery(internal.ai.queries._requireAdminFromAction, {});
    await ctx.runMutation(internal.ai.internal.checkAdminRateLimit, {
      scope: RATE_LIMITS.aiAdminTest.scope,
      max: RATE_LIMITS.aiAdminTest.max,
      windowMs: RATE_LIMITS.aiAdminTest.windowMs,
    });

    let cfg: ResolvedAI;
    const inlineKey = args.apiKey?.trim();
    if (inlineKey && args.provider && args.model) {
      if (!INLINE_TEST_ALLOWED.has(args.provider)) {
        throw new Error(
          `Inline test not allowed for provider "${args.provider}" — save the config first, then re-test.`,
        );
      }
      // Inline-test path — admin is validating before save. baseUrl arg
      // is IGNORED here; resolveProviderBaseUrl falls back to the
      // catalog's known good base URL for the chosen provider.
      cfg = {
        baseUrl: resolveProviderBaseUrl(args.provider),
        apiKey: inlineKey,
        model: args.model.trim(),
        source: "inline",
      } as ResolvedAI;
    } else {
      cfg = await resolveAI(ctx);
    }
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 5,
        messages: [
          { role: "system", content: "Reply with only the word: OK" },
          { role: "user", content: "ping" },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // Surface the upstream body — most provider errors include a hint
      // (invalid key, model not found, billing required) the admin can
      // act on directly.
      throw new Error(`Test failed (HTTP ${res.status}, source=${cfg.source}): ${detail.slice(0, 200) || res.statusText}`);
    }
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content ?? "";
    return { ok: true, source: cfg.source, model: cfg.model, reply: String(reply).slice(0, 80) };
  },
});

/** Admin-only — live OpenRouter model catalog with pricing. Gated +
 *  rate-limited so the public Convex endpoint can't be turned into an
 *  unauthenticated bandwidth-burn / amplification vector against
 *  openrouter.ai. */
export const listOpenRouterModels = action({
  args: {},
  handler: async (ctx): Promise<Array<{ id: string; name: string; promptUsd: number; completionUsd: number; context: number }>> => {
    await ctx.runQuery(internal.ai.queries._requireAdminFromAction, {});
    await ctx.runMutation(internal.ai.internal.checkAdminRateLimit, {
      scope: RATE_LIMITS.aiAdminCatalog.scope,
      max: RATE_LIMITS.aiAdminCatalog.max,
      windowMs: RATE_LIMITS.aiAdminCatalog.windowMs,
    });
    const r = await fetch("https://openrouter.ai/api/v1/models");
    if (!r.ok) throw new Error(`OpenRouter responded ${r.status}`);
    const j = (await r.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        pricing?: { prompt?: string; completion?: string };
        context_length?: number;
      }>;
    };
    if (!Array.isArray(j.data)) return [];
    return j.data.map((m) => ({
      id: String(m.id),
      name: String(m.name ?? m.id),
      // Pricing returned per-token in USD. Convert to USD per million for legibility.
      promptUsd: (parseFloat(m.pricing?.prompt ?? "0") || 0) * 1_000_000,
      completionUsd: (parseFloat(m.pricing?.completion ?? "0") || 0) * 1_000_000,
      context: Number(m.context_length ?? 0),
    }));
  },
});
