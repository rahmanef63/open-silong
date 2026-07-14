/** Provider-prefixed model-ref parser.
 *
 *  The AI console's user model picker sends model selections as
 *  `"<provider>/<model>"` refs (e.g. `"openai-codex/gpt-5"`,
 *  `"openrouter/google/gemini-3.1-flash-lite"`, `"openai/gpt-4o"`).
 *  Legacy callers (summaries, admin config, AskAI) send a BARE model
 *  string with no provider prefix — those must keep flowing through the
 *  admin-provider path untouched, so we only peel a prefix off when the
 *  first path segment is a KNOWN provider.
 *
 *  Split is on the FIRST "/" only: OpenRouter model ids are themselves
 *  `vendor/model`, so `"openrouter/google/gemini-x"` → provider
 *  `openrouter`, model `google/gemini-x`.
 *
 *  Pure + ctx-free so it's unit-testable and importable from both the
 *  node-runtime chat action and plain modules.
 */

/** Provider prefixes the picker may emit. Anything else (e.g. a bare
 *  `google/gemini-…` OpenRouter model id where `meta-llama`/`x-ai` are
 *  NOT provider names) is treated as a legacy bare model string. */
export const BYOK_PROVIDER_PREFIXES: ReadonlySet<string> = new Set([
  "openai",
  "anthropic",
  "google",
  "openrouter",
  "custom",
  "openai-codex",
]);

export interface ParsedModelRef {
  /** A known provider prefix, or `null` for a legacy bare model string. */
  provider: string | null;
  /** The remainder after the prefix, or the whole input when `provider` is null. */
  model: string;
}

export function parseModelRef(ref: string): ParsedModelRef {
  const slash = ref.indexOf("/");
  if (slash === -1) return { provider: null, model: ref };
  const seg0 = ref.slice(0, slash);
  if (BYOK_PROVIDER_PREFIXES.has(seg0)) {
    return { provider: seg0, model: ref.slice(slash + 1) };
  }
  return { provider: null, model: ref };
}
