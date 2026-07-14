"use node";

import { action, type ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";

import { CHAR_CAPS, RATE_LIMITS } from "../_shared/limits";
import { AI_PROVIDERS, resolveProviderBaseUrl } from "../_shared/aiProviders";
import { resolveAiKey, type Provider as ByokProvider } from "../_shared/aiKeyResolver";
import { parseModelRef } from "../_shared/modelRef";
import { decryptApiKey, encryptApiKey } from "../_shared/aiCrypto";
import { ensureFreshCodex, codexChat, type CodexBundle } from "../_shared/codexLib";
import type { Id } from "../_generated/dataModel";
import { SKILL_BY_TOOL_NAME, SKILL_BY_ID, toolsForLLM, type Skill } from "./skillCatalog";
import { SKILL_HANDLERS } from "./skillHandlers";

const MAX_INPUT_CHARS = CHAR_CAPS.aiInput;
const MAX_TOKENS_HARD_CAP = 4096;
const MAX_HOPS = 4;
const TOOL_RESULT_CHAR_CAP = 8000;
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

type ResolvedSource = "global" | "env" | "inline" | "user" | "workspace";

/** Discriminated so the ChatGPT/Codex OAuth path can carry a refreshable
 *  token bundle (Responses API) instead of a baseUrl + Bearer key
 *  (chat/completions). The `complete` action short-circuits on
 *  `mode:"codex"` before the tool loop; everything else stays `http`. */
type ResolvedAI =
  | { mode: "http"; baseUrl: string; apiKey: string; model: string; source: ResolvedSource }
  | { mode: "codex"; bundle: CodexBundle; model: string; source: ResolvedSource; keyId: Id<"aiUserKeys"> };

const BYOK_PROVIDERS = new Set(["openai", "anthropic", "google", "openrouter", "custom"]);

/** Resolve + refresh the caller's ChatGPT/Codex OAuth bundle. ToS-grey:
 *  only reached when the user explicitly selected an `openai-codex/*`
 *  model. Refreshes + re-persists the token bundle when it's near expiry
 *  so the returned bundle is always live. */
async function resolveCodex(
  ctx: ActionCtx,
  userId: Id<"users">,
  model: string,
): Promise<ResolvedAI> {
  const row = await ctx.runQuery(internal.aiKeys.codex._getCodexKey, { userId });
  if (!row) {
    throw new Error("No ChatGPT connection — connect it in Settings → AI first.");
  }
  let bundle: CodexBundle;
  try {
    bundle = JSON.parse(await decryptApiKey(row.encryptedKey));
  } catch {
    throw new Error("ChatGPT connection is unreadable — reconnect it in Settings → AI.");
  }
  const { bundle: fresh, refreshed } = await ensureFreshCodex(bundle);
  if (refreshed) {
    await ctx.runMutation(internal.aiKeys.codex._storeCodexBundle, {
      keyId: row._id,
      encryptedKey: await encryptApiKey(JSON.stringify(fresh)),
    });
  }
  return { mode: "codex", bundle: fresh, model, source: "user", keyId: row._id };
}

/** Resolution order (BYOK-first — a stored user key is the whole point):
 *  1. The signed-in user's PERSONAL / workspace-SHARED `aiUserKeys` key for
 *     the active provider (Settings → AI, incl. the OpenRouter OAuth key).
 *  2. admin-managed `globalAISettings` (live config from the admin panel).
 *     Per-user `aiUserModelOverrides` may swap the model.
 *  3. env var `OPENROUTER_API_KEY` — preserved fallback for fresh deploys.
 *  Provider/model/baseUrl come from the admin config when present, else the
 *  OpenRouter catalog default, so BYOK also works with no admin config.
 */
async function resolveAI(
  ctx: ActionCtx,
  callerOverrideModel?: string,
): Promise<ResolvedAI> {
  const userId = await getAuthUserId(ctx);

  // Global config + per-user override + active workspace in one round-trip.
  const { global, override, activeWorkspaceId } = await ctx.runQuery(
    internal.ai.queries._getAIResolution,
    userId ? { userId } : {},
  );

  // Desired provider / model / base URL.
  const provider = global?.provider ?? "openrouter";
  let effectiveModel = global?.model ?? AI_PROVIDERS.openrouter.defaultModel;
  if (override) effectiveModel = override;
  if (callerOverrideModel) effectiveModel = callerOverrideModel; // caller wins (e.g. summaries)

  // Provider-ref routing applies ONLY to an explicit caller/picker
  // selection ("openai-codex/gpt-5", "openrouter/google/gemini-…",
  // "openai/gpt-4o"). It must NEVER parse admin config models: an
  // OpenRouter model id is itself vendor-prefixed (e.g. the default
  // "google/gemini-3.1-flash-lite"), and treating "google" as a BYOK
  // provider would silently divert the admin's OpenRouter config to the
  // user's Google key. So parse the caller arg only; absent it, the
  // admin path runs untouched.
  const ref = callerOverrideModel
    ? parseModelRef(callerOverrideModel)
    : { provider: null as string | null, model: effectiveModel };

  // 0) ChatGPT/Codex OAuth (ToS-grey, opt-in) — explicit picker selection.
  if (ref.provider === "openai-codex") {
    if (!userId) throw new Error("Sign in to use your ChatGPT connection.");
    return await resolveCodex(ctx, userId, ref.model);
  }

  // 1a) Explicit provider ref from the picker → that provider's BYOK key.
  //     Only diverts when the user actually HAS a key for it; otherwise we
  //     fall through to the legacy path with the ORIGINAL (unstripped) ref
  //     so summaries/admin behaviour never changes.
  if (ref.provider && userId && activeWorkspaceId && BYOK_PROVIDERS.has(ref.provider)) {
    try {
      const k = await resolveAiKey(ctx, {
        userId,
        workspaceId: activeWorkspaceId,
        provider: ref.provider as ByokProvider,
      });
      if (k.source === "user" || k.source === "workspace") {
        return {
          mode: "http",
          baseUrl: k.endpoint || resolveProviderBaseUrl(ref.provider),
          apiKey: k.plaintext,
          model: ref.model,
          source: k.source,
        };
      }
    } catch {
      /* no key for the picked provider — fall through to legacy */
    }
  }

  // Legacy path — admin provider + BYOK-first for the admin provider.
  const model = effectiveModel;
  const baseUrl = resolveProviderBaseUrl(provider, global?.baseUrl ?? undefined);

  // 1b) BYOK — user's own or workspace-shared key for the admin provider
  //     wins. resolveAiKey throws on miss; treat that as "no user key" and
  //     fall through. It also returns an env "admin" tier, which we ignore
  //     here so the admin/env fallbacks below own that path.
  if (userId && activeWorkspaceId && BYOK_PROVIDERS.has(provider)) {
    try {
      const k = await resolveAiKey(ctx, {
        userId,
        workspaceId: activeWorkspaceId,
        provider: provider as ByokProvider,
      });
      if (k.source === "user" || k.source === "workspace") {
        return { mode: "http", baseUrl: k.endpoint || baseUrl, apiKey: k.plaintext, model, source: k.source };
      }
    } catch {
      /* no user/workspace key — fall through to admin/env */
    }
  }

  // 2) Admin global config.
  if (global) {
    return { mode: "http", baseUrl, apiKey: global.apiKey, model, source: "global" };
  }

  // 3) env fallback (OpenRouter), preserved so a fresh deploy still works.
  const envKey = process.env.OPENROUTER_API_KEY;
  if (envKey) {
    const openrouter = AI_PROVIDERS.openrouter;
    return {
      mode: "http",
      baseUrl: openrouter.baseUrl,
      apiKey: envKey,
      model: callerOverrideModel ?? openrouter.defaultModel,
      source: "env",
    };
  }

  // 4) Nothing available — actionable diagnostics.
  const probe = await ctx.runQuery(internal.ai.queries._probeGlobalAISettings, {});
  if (probe?.exists && !probe.enabled) {
    throw new Error("AI is configured but disabled — toggle Enabled in /dashboard/admin → AI and Save.");
  }
  if (probe?.exists && !probe.hasKey) {
    throw new Error("AI provider is set but the API key is missing — paste a key in /dashboard/admin → AI and Save.");
  }
  throw new Error(
    "AI not configured — connect a key in Settings → AI (BYOK), set the OpenRouter key in /dashboard/admin → AI, or set OPENROUTER_API_KEY in Convex env.",
  );
}

export const complete = action({
  args: {
    messages: v.array(MessageSchema),
    system: v.optional(v.string()),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    /** Active context captured by the frontend (current page, user
     *  identity). Injected as a `<USER_CONTEXT>` block in the system
     *  prompt so the model can resolve "this page" / "ini" without
     *  asking, and call write skills with the right pageId. */
    context: v.optional(v.object({
      activePageId: v.optional(v.string()),
      activePageTitle: v.optional(v.string()),
      userName: v.optional(v.string()),
      workspaceName: v.optional(v.string()),
    })),
    /** When true, mutation-kind skill calls run server-side inline
     *  (legacy v1 behaviour). When false (default), mutations are
     *  queued as proposals[] for the user to approve via the action
     *  card UI before they fire. */
    autoApply: v.optional(v.boolean()),
    /** Client-generated id for the live-progress doc. When present,
     *  the action upserts step-by-step progress to aiRunProgress so
     *  the UI can subscribe and render a real-time timeline. */
    runId: v.optional(v.string()),
  },
  handler: async (ctx, { messages, system, model, maxTokens, context, autoApply, runId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    await ctx.runMutation(internal.ai.internal.checkRateLimit, {});

    if (messages.length === 0) throw new Error("Empty conversation");

    const totalChars = messages.reduce((n, m) => n + m.content.length, 0)
      + (system?.length ?? 0);
    if (totalChars > MAX_INPUT_CHARS) {
      throw new Error(`Input too large (${totalChars} > ${MAX_INPUT_CHARS} chars)`);
    }

    const cfg = await resolveAI(ctx, model);
    const cap = Math.min(maxTokens ?? 2048, MAX_TOKENS_HARD_CAP);

    const baseSystem = system ?? "You are Nosion, a calm and concise assistant inside a Notion-like notes workspace. You can call tools to read AND write the user's pages: list/search, read content, append markdown, create pages, rename, set icon. Prefer pages_search over pages_list when the user names a topic. Reply in markdown. Be direct and helpful.";

    let systemContent = baseSystem;
    if (context && (context.activePageId || context.userName || context.workspaceName)) {
      const lines: string[] = ["<USER_CONTEXT>"];
      if (context.activePageId) lines.push(`activePageId: ${context.activePageId}`);
      if (context.activePageTitle) lines.push(`activePageTitle: ${JSON.stringify(context.activePageTitle)}`);
      if (context.userName) lines.push(`userName: ${JSON.stringify(context.userName)}`);
      if (context.workspaceName) lines.push(`workspaceName: ${JSON.stringify(context.workspaceName)}`);
      lines.push("</USER_CONTEXT>");
      lines.push("");
      lines.push("When the user says 'this page', 'current page', 'ini', 'halaman ini', 'di sini', use the activePageId from USER_CONTEXT directly — do NOT ask which page. For create-then-fill flows you can call pages_create then pass the returned pageId to pages_append_markdown in the SAME turn.");
      systemContent = `${baseSystem}\n\n${lines.join("\n")}`;
    }

    const conversation: Array<Record<string, unknown>> = [];
    conversation.push({ role: "system", content: systemContent });
    for (const m of messages) conversation.push({ role: m.role, content: m.content });

    const referer = process.env.OPENROUTER_REFERER ?? "https://silong.rahmanef.com";
    const title = process.env.OPENROUTER_APP_NAME ?? "open-silong";
    const tools = toolsForLLM();

    const progress: Array<{ kind: string; label: string; skillId?: string; ms?: number; ok?: boolean }> = [];
    progress.push({ kind: "resolve", label: `Resolved AI (${cfg.source}) → ${cfg.model}` });
    const proposals: Array<{ id: string; skillId: string; label: string; args: Record<string, unknown> }> = [];
    const apply = autoApply === true;

    // Live progress writer — fire-and-forget upsert so client useQuery
    // re-emits the timeline as it grows. Skips when runId not provided.
    const flushProgress = async () => {
      if (!runId) return;
      try {
        await ctx.runMutation(internal.ai.internal.writeProgress, { runId, userId, steps: progress });
      } catch { /* progress is advisory — never block on a failure */ }
    };
    await flushProgress();

    // ── ChatGPT/Codex OAuth short-circuit (ToS-grey, opt-in) ───────────
    // Only reached when the user explicitly picked an `openai-codex/*`
    // model. The Codex backend is a Responses API, not chat/completions,
    // and has no tool-calling in this integration → single hop, no tools,
    // no proposals. Any failure here is isolated to codex-selected
    // requests; the normal AI path never enters this branch. After this
    // early return TS narrows `cfg` to the `http` variant below.
    if (cfg.mode === "codex") {
      const codexMessages = conversation.map((m) => ({
        role: String(m.role),
        content: typeof m.content === "string" ? m.content : "",
      }));
      const t0 = Date.now();
      const out = await codexChat(cfg.bundle, cfg.model, codexMessages);
      const codexMs = Date.now() - t0;
      const usage = { input_tokens: out.promptTokens, output_tokens: out.completionTokens };
      const delta = out.promptTokens + out.completionTokens;
      if (delta > 0) {
        // ponytail: reuse the existing token-ledger mutation for quota
        // bookkeeping; the richer aiUsageLog row is skipped for codex
        // (the normal chat path doesn't write it either).
        try { await ctx.runMutation(internal.ai.internal.recordAiUsage, { tokens: delta }); }
        catch { /* advisory */ }
      }
      progress.push({ kind: "finalize", label: `ChatGPT (Codex) · ${codexMs}ms` });
      await flushProgress();
      if (runId) {
        try { await ctx.runMutation(internal.ai.internal.clearProgress, { runId }); } catch { /* advisory */ }
      }
      return {
        text: out.text,
        usage,
        model: cfg.model,
        source: cfg.source,
        progress,
        proposals: [] as Array<{ id: string; skillId: string; label: string; args: Record<string, unknown> }>,
      };
    }

    let reply = "";
    let totalLlmMs = 0;
    // Plain number accumulators — an object that reads its own prior value
    // in its initializer (`x = { in: x?.in + d }`) makes tsc collapse the
    // in-flight type to `never`/`any` (TS2339/TS7022). Sum, wrap once at return.
    let usageIn = 0;
    let usageOut = 0;
    let lastModel = cfg.model;
    let hop = 0;
    let exhausted = true;

    while (hop < MAX_HOPS) {
      hop++;
      const t0 = Date.now();
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
          messages: conversation,
          tools,
          tool_choice: "auto",
        }),
      });
      totalLlmMs += Date.now() - t0;
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI gateway ${res.status} (${cfg.source}): ${text.slice(0, 300)}`);
      }
      const data = await res.json() as {
        choices?: { message?: { content?: string; tool_calls?: Array<{ id: string; type?: string; function?: { name?: string; arguments?: string } }> } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        model?: string;
      };
      lastModel = data.model ?? cfg.model;
      if (data.usage) {
        const inDelta = data.usage.prompt_tokens ?? 0;
        const outDelta = data.usage.completion_tokens ?? 0;
        usageIn += inDelta;
        usageOut += outDelta;
        // Record spend immediately so the next hop / call sees the
        // updated ledger — important inside the multi-hop loop where a
        // runaway tool-call chain could otherwise blow past the cap
        // before the action returns.
        const delta = inDelta + outDelta;
        if (delta > 0) {
          try { await ctx.runMutation(internal.ai.internal.recordAiUsage, { tokens: delta }); }
          catch { /* advisory — never block on bookkeeping */ }
        }
      }
      const message = data.choices?.[0]?.message;
      const content = typeof message?.content === "string" ? message.content : "";
      const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];

      // No tool calls → final answer.
      if (toolCalls.length === 0) {
        reply = content;
        exhausted = false;
        break;
      }

      // Echo the assistant turn (with tool_calls) so the model sees its
      // own ids when we feed results back.
      conversation.push({ role: "assistant", content: content || null, tool_calls: toolCalls });

      for (const tc of toolCalls) {
        if (tc.type !== "function") continue;
        const toolName = String(tc.function?.name ?? "");
        const skill: Skill | undefined = SKILL_BY_TOOL_NAME[toolName];
        const skillId = skill?.id ?? toolName.replace(/_/g, ".");
        let parsedArgs: Record<string, unknown> = {};
        const rawArgs = tc.function?.arguments;
        if (typeof rawArgs === "string") {
          try { parsedArgs = JSON.parse(rawArgs); } catch { /* invalid */ }
        }
        const handler = SKILL_HANDLERS[skillId];
        const skillKind = skill?.kind ?? "query";
        // Mutation skills go through the approval pipeline unless the
        // caller explicitly opted into autoApply. Query skills always
        // run inline so the model can chain.
        if (skillKind === "mutation" && !apply) {
          const proposalId = `${skillId}-${Date.now()}-${proposals.length}`;
          proposals.push({
            id: proposalId,
            skillId,
            label: skill?.description?.split(".")[0] ?? `Run ${skillId}`,
            args: parsedArgs,
          });
          progress.push({ kind: "tool", skillId, label: `Proposed ${skillId} (awaiting approval)`, ok: true });
          await flushProgress();
          conversation.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({
              status: "queued_for_user_approval",
              proposalId,
              note: "User must approve via the action card UI before this runs.",
            }),
          });
          continue;
        }
        const t1 = Date.now();
        let result: unknown;
        let ok = true;
        if (!handler) {
          result = { error: `No handler for skill ${skillId}` };
          ok = false;
        } else {
          try { result = await handler(ctx, parsedArgs); }
          catch (e) { result = { error: e instanceof Error ? e.message : String(e) }; ok = false; }
        }
        progress.push({ kind: "tool", skillId, label: `Called ${skillId}`, ms: Date.now() - t1, ok });
        await flushProgress();
        const serialised = JSON.stringify(result).slice(0, TOOL_RESULT_CHAR_CAP);
        conversation.push({ role: "tool", tool_call_id: tc.id, content: serialised });
      }
      // Loop continues so the model can use tool results.
    }

    if (exhausted && !reply) {
      const lastAssistant = [...conversation].reverse().find((m) =>
        m.role === "assistant" && typeof m.content === "string" && (m.content as string).trim().length > 0,
      );
      reply = (lastAssistant?.content as string) ?? "I ran out of steps for that request. Try narrowing the question.";
    }

    progress.push({ kind: "finalize", label: `Inference done · ${totalLlmMs}ms across ${hop} hop${hop === 1 ? "" : "s"}` });
    await flushProgress();
    // Best-effort cleanup so stale progress docs don't pile up.
    if (runId) {
      try { await ctx.runMutation(internal.ai.internal.clearProgress, { runId }); } catch { /* advisory */ }
    }

    // If we queued any mutation proposals but the model didn't speak,
    // synthesize a brief confirmation so the user sees what's pending.
    if (proposals.length > 0 && !reply.trim()) {
      reply = `Saya menyiapkan ${proposals.length} tindakan untuk persetujuan Anda — tinjau dan klik **Approve** di bawah.`;
    }

    return {
      text: reply,
      usage: usageIn + usageOut > 0 ? { input_tokens: usageIn, output_tokens: usageOut } : null,
      model: lastModel,
      source: cfg.source,
      progress,
      proposals,
    };
  },
});

/** Execute a single mutation proposal that the user approved via the
 *  action card. Runs the matching skill handler with the supplied
 *  args. Returns { ok, result } so the UI can render success / error. */
export const executeProposal = action({
  args: {
    skillId: v.string(),
    args: v.any(),
  },
  handler: async (ctx, { skillId, args }): Promise<{ ok: boolean; result?: unknown; error?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const skill = SKILL_BY_ID[skillId];
    if (!skill) return { ok: false, error: `Unknown skill: ${skillId}` };
    if (skill.kind !== "mutation") return { ok: false, error: `Skill ${skillId} is not a mutation` };
    const handler = SKILL_HANDLERS[skillId];
    if (!handler) return { ok: false, error: `No handler for skill ${skillId}` };
    try {
      const result = await handler(ctx, args ?? {});
      return { ok: true, result };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
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
        mode: "http",
        baseUrl: resolveProviderBaseUrl(args.provider),
        apiKey: inlineKey,
        model: args.model.trim(),
        source: "inline",
      };
    } else {
      cfg = await resolveAI(ctx);
    }
    // Admin connectivity test only exercises the chat/completions path.
    // A codex-selected config (OAuth) has no baseUrl/apiKey to test here.
    if (cfg.mode !== "http") {
      throw new Error("The admin test does not cover the ChatGPT (Codex) connection.");
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
