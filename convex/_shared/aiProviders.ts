/** AI provider catalog — kept separate from `aiSettings` so the catalog
 *  can ship the same way to the admin panel (model picker dropdowns +
 *  base-URL defaults) and to the resolver in `convex/ai/chat.ts`.
 *
 *  Adding a provider: push an entry, redeploy. The admin panel picks it
 *  up automatically via `listAIProviders` query. Models[] is a minimal
 *  curated default — for OpenRouter the live catalog comes from
 *  `ai.listOpenRouterModels`.
 */

export interface AIProviderSpec {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  models: readonly string[];
  docsUrl?: string;
}

export const AI_PROVIDERS: Record<string, AIProviderSpec> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-haiku-4.5",
    models: [
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-sonnet-4.5",
      "openai/gpt-4o-mini",
      "openai/gpt-4o",
      "google/gemini-2.5-pro",
      "google/gemini-2.5-flash",
      "x-ai/grok-4",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "moonshotai/kimi-k2",
    ],
    docsUrl: "https://openrouter.ai/keys",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4o-mini", "o4-mini"],
    docsUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic (direct)",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-haiku-4-5",
    models: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
    docsUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "deepseek-r1-distill-llama-70b"],
    docsUrl: "https://console.groq.com/keys",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    docsUrl: "https://platform.deepseek.com/api_keys",
  },
  custom: {
    id: "custom",
    label: "Custom (OpenAI-compat)",
    baseUrl: "",
    defaultModel: "",
    models: [],
  },
};

export type AIProviderId = keyof typeof AI_PROVIDERS;

/** Resolve a provider's base URL, optionally overridden by an admin-supplied
 *  `baseUrl` (required for the `custom` provider). Trailing slashes stripped. */
export function resolveProviderBaseUrl(provider: string, override?: string): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed.replace(/\/+$/, "");
  const spec = AI_PROVIDERS[provider];
  if (!spec || !spec.baseUrl) {
    throw new Error(`Unknown AI provider: ${provider}`);
  }
  return spec.baseUrl.replace(/\/+$/, "");
}

/** Surface the catalog to the client without exposing internal references. */
export function listProvidersPublic() {
  return Object.values(AI_PROVIDERS).map(({ id, label, baseUrl, defaultModel, models, docsUrl }) => ({
    id,
    label,
    baseUrl,
    defaultModel,
    models: [...models],
    docsUrl,
  }));
}
