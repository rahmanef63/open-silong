/** codexLib — "Sign in with ChatGPT" (OpenAI Codex CLI) BYOK primitives.
 *
 *  ⚠️ ToS: This talks to OpenAI's UNOFFICIAL, reverse-engineered Codex
 *  CLI device-auth + backend endpoints (`auth.openai.com/api/accounts/*`
 *  and `chatgpt.com/backend-api/codex/*`). It rides a user's own ChatGPT
 *  subscription — NOT a paid API key — and is a grey-area integration the
 *  user explicitly opted into. It is GATED: nothing here runs unless the
 *  user connects a ChatGPT account and then explicitly selects an
 *  `openai-codex/*` model in the AI console picker. It never touches the
 *  default admin / OpenRouter / summary paths.
 *
 *  ponytail: pure helper module (no Convex ctx) so it's importable from
 *  both the node-runtime chat action and the default-runtime codex
 *  action, and so the ToS-grey surface is contained in one file.
 */

// ToS: reverse-engineered constants lifted from the Codex CLI. The
// `clientId` is the CLI's public OAuth client id (device-auth flow).
export const CODEX = {
  clientId: "app_EMoamEEZ73f0CkXaXp7hrann",
  usercodeUrl: "https://auth.openai.com/api/accounts/deviceauth/usercode",
  pollUrl: "https://auth.openai.com/api/accounts/deviceauth/token",
  tokenUrl: "https://auth.openai.com/oauth/token",
  deviceRedirect: "https://auth.openai.com/deviceauth/callback",
  verificationUrl: "https://auth.openai.com/codex/device",
  apiBase: "https://chatgpt.com/backend-api/codex",
} as const;

/** Decrypted, refreshable OAuth bundle stored (encrypted) in the codex
 *  aiUserKeys row. `expires` is epoch ms. */
export type CodexBundle = {
  access: string;
  refresh: string;
  expires: number;
  accountId?: string;
};

// ToS: the Codex backend keys off `originator: codex_cli_rs` + a
// `ChatGPT-Account-ID` header derived from the access token. We mimic the
// CLI's headers so the subscription backend accepts the request.
function codexHeaders(bundle: CodexBundle): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${bundle.access}`,
    originator: "codex_cli_rs",
    "User-Agent": "codex_cli_rs/0.0.0 (open-silong)",
  };
  const accountId = bundle.accountId || decodeAccountId(bundle.access);
  if (accountId) h["ChatGPT-Account-ID"] = accountId;
  return h;
}

/** Pull the `chatgpt_account_id` claim out of the JWT access token
 *  without verifying the signature (we only need the id for the header). */
export function decodeAccountId(access: string): string | undefined {
  try {
    const payload = JSON.parse(
      atob(access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload["https://api.openai.com/auth"]?.chatgpt_account_id;
  } catch {
    return undefined;
  }
}

/** Refresh the bundle when it's within 2 min of expiry. Returns the
 *  (possibly) new bundle + a `refreshed` flag so the caller can persist
 *  the rotated tokens. */
export async function ensureFreshCodex(
  bundle: CodexBundle,
): Promise<{ bundle: CodexBundle; refreshed: boolean }> {
  if (Date.now() < bundle.expires - 120_000) return { bundle, refreshed: false };
  const res = await fetch(CODEX.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: bundle.refresh,
      client_id: CODEX.clientId,
    }),
  });
  if (!res.ok) {
    throw new Error(`codex token refresh failed (${res.status}) — reconnect OpenAI`);
  }
  const j = await res.json();
  const next: CodexBundle = {
    access: j.access_token,
    refresh: j.refresh_token || bundle.refresh,
    expires: Date.now() + (j.expires_in ?? 3600) * 1000,
    accountId: decodeAccountId(j.access_token) || bundle.accountId,
  };
  return { bundle: next, refreshed: true };
}

/** List the models the connected ChatGPT account can drive. Best-effort:
 *  returns [] on any non-OK response (the caller falls back to defaults). */
export async function codexModels(bundle: CodexBundle): Promise<string[]> {
  // ToS: unofficial models endpoint on the ChatGPT subscription backend.
  const res = await fetch(`${CODEX.apiBase}/models?client_version=1.0.0`, {
    headers: { ...codexHeaders(bundle), accept: "application/json" },
  });
  if (!res.ok) return [];
  const j = await res.json();
  const arr = Array.isArray(j) ? j : j.models || j.data || [];
  return arr
    .map((m: unknown) =>
      typeof m === "string"
        ? m
        : (m as { id?: string; slug?: string })?.id ||
          (m as { slug?: string })?.slug,
    )
    .filter(Boolean) as string[];
}

/** Single-shot completion against the Codex `responses` SSE endpoint.
 *  No tools, no streaming to the client — we buffer the SSE and return
 *  the concatenated text + token usage. */
export async function codexChat(
  bundle: CodexBundle,
  model: string,
  messages: { role: string; content: string }[],
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  // ToS: the Codex backend speaks the OpenAI "Responses" API (experimental
  // beta), not chat/completions. System turns become `instructions`; the
  // rest map to typed input/output_text content blocks.
  const instructions = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const input = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      type: "message",
      role: m.role,
      content: [
        {
          type: m.role === "assistant" ? "output_text" : "input_text",
          text: m.content,
        },
      ],
    }));
  const res = await fetch(`${CODEX.apiBase}/responses`, {
    method: "POST",
    headers: {
      ...codexHeaders(bundle),
      "OpenAI-Beta": "responses=experimental",
      accept: "text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, store: false, stream: true, instructions, input }),
  });
  const sse = await res.text();
  if (!res.ok) throw new Error(`codex responses ${res.status}: ${sse.slice(0, 200)}`);
  let out = "";
  let promptTokens = 0;
  let completionTokens = 0;
  for (const line of sse.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const ev = JSON.parse(data);
      if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") {
        out += ev.delta;
      }
      if (ev.response?.usage) {
        promptTokens = ev.response.usage.input_tokens ?? promptTokens;
        completionTokens = ev.response.usage.output_tokens ?? completionTokens;
      }
    } catch {
      /* skip malformed SSE frames */
    }
  }
  return { text: out || "(no text in response)", promptTokens, completionTokens };
}
