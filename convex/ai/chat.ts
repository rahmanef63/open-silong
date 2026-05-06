"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";
const MAX_INPUT_CHARS = 60_000;
const MAX_TOKENS_HARD_CAP = 4096;

const MessageSchema = v.object({
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  content: v.string(),
});

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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY tidak diset di Convex env");
    }
    if (messages.length === 0) throw new Error("Pesan kosong");

    const totalChars = messages.reduce((n, m) => n + m.content.length, 0)
      + (system?.length ?? 0);
    if (totalChars > MAX_INPUT_CHARS) {
      throw new Error(`Input terlalu besar (${totalChars} > ${MAX_INPUT_CHARS} chars)`);
    }

    const modelId = model ?? DEFAULT_MODEL;
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

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": referer,
        "X-Title": title,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: cap,
        messages: apiMessages,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
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
      model: data.model ?? modelId,
    };
  },
});
