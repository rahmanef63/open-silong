"use node";

import { action, type ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";

import { CHAR_CAPS } from "../_shared/limits";
import { resolveProviderBaseUrl } from "../_shared/aiProviders";

const ENV_DEFAULT_MODEL = "anthropic/claude-haiku-4.5";
const ENV_BASE_URL = "https://openrouter.ai/api/v1";
const MAX_INPUT_CHARS = CHAR_CAPS.aiInput;
const MAX_TOKENS_HARD_CAP = 4096;

const MessageSchema = v.object({
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  content: v.string(),
});

interface ResolvedAI {
  baseUrl: string;
  apiKey: string;
  model: string;
  source: "global" | "env";
}

/** Resolution order:
 *  1. admin-managed `globalAISettings` (live config from the admin panel).
 *     Per-user `aiUserModelOverrides` row may swap the model field while
 *     keeping the same provider + key.
 *  2. env var `OPENROUTER_API_KEY` — original behaviour, preserved as
 *     the fallback so a fresh deploy without admin config still works.
 */
async function resolveAI(
  ctx: ActionCtx,
  callerOverrideModel?: string,
): Promise<ResolvedAI> {
  const userId = await getAuthUserId(ctx);

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
    throw new Error(
      "AI not configured — admin must set the OpenRouter key in /dashboard/admin → AI, or set OPENROUTER_API_KEY in Convex env.",
    );
  }
  return {
    baseUrl: ENV_BASE_URL,
    apiKey: envKey,
    model: callerOverrideModel ?? ENV_DEFAULT_MODEL,
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
 *  one-token "ping" through the resolver chain so the admin can verify
 *  whether their just-saved global config actually works before users
 *  hit a broken key. */
export const testConnection = action({
  args: {},
  handler: async (ctx) => {
    // Goes through the same resolver as `complete`. Admin gating happens
    // at the UI layer (button only rendered for admins) + the underlying
    // settings the test reads are admin-only via `getGlobalAISettings`.
    const cfg = await resolveAI(ctx);
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
      throw new Error(`Test failed ${res.status} (${cfg.source}): ${detail.slice(0, 200)}`);
    }
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content ?? "";
    return { ok: true, source: cfg.source, model: cfg.model, reply: String(reply).slice(0, 80) };
  },
});

/** Admin-only — live OpenRouter model catalog with pricing. Public OR
 *  endpoint, no auth required by OpenRouter itself, but admin-gated on
 *  our side because the model picker is admin UX. */
export const listOpenRouterModels = action({
  args: {},
  handler: async (): Promise<Array<{ id: string; name: string; promptUsd: number; completionUsd: number; context: number }>> => {
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
