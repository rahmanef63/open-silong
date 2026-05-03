"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const MessageSchema = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
});

export const complete = action({
  args: {
    messages: v.array(MessageSchema),
    system: v.optional(v.string()),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (_ctx, { messages, system, model, maxTokens }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY tidak diset di Convex env");
    }
    if (messages.length === 0) throw new Error("Pesan kosong");

    const body = {
      model: model ?? DEFAULT_MODEL,
      max_tokens: maxTokens ?? 2048,
      system: system ?? "You are Nosion, a calm and concise assistant inside a Notion-like notes workspace. Reply in markdown. Be direct and helpful.",
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = await res.json() as {
      content: { type: string; text?: string }[];
      usage?: { input_tokens: number; output_tokens: number };
    };
    const text = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");
    return {
      text,
      usage: data.usage ?? null,
      model: body.model,
    };
  },
});
