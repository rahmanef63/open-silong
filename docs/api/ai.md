# AI API — `convex/ai/`

OpenRouter chat completion. Routed through OpenRouter so the
deployment can swap models without changing client code. Default
model: `anthropic/claude-haiku-4.5` (fast, cheap, good for
selection-toolbar rewrites and short prompts).

Source: `convex/ai/{chat,internal}.ts`. Cycle-2 hardening replaced
the direct Anthropic call with OpenRouter + auth gate + rate limit.

---

## Function

### `complete({messages, system?, model?, maxTokens?})` — action

`"use node"` action (uses `fetch` to OpenRouter). Returns:

```ts
{
  text: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  } | null;
  model: string;             // resolved model id (passes through OpenRouter)
}
```

### Args

```ts
{
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  system?: string;            // optional system prompt; default Nosion blurb
  model?: string;             // OpenRouter model id; default anthropic/claude-haiku-4.5
  maxTokens?: number;         // capped at 4 096
}
```

### Auth + caps

- `getAuthUserId(ctx)` — anonymous → throws "Belum login"
- `ctx.runMutation(internal.ai.internal.checkRateLimit)` — **20 / hour**
- Input size: total chars across `messages[]` + `system` ≤ 60 000
  (`MAX_INPUT_CHARS`)
- Output: hard cap 4 096 tokens

### Errors

- `"Belum login"` — no auth
- `"OPENROUTER_API_KEY tidak diset di Convex env"` — missing env (deploy bug)
- `"Pesan kosong"` — empty messages array
- `"Input terlalu besar (X > 60000 chars)"` — over the input budget
- `"OpenRouter <status>: <body slice>"` — upstream failure (raw body
  truncated to 300 chars; not user-friendly but actionable for ops)

---

## Env vars

| name | required | default | purpose |
|---|---|---|---|
| `OPENROUTER_API_KEY` | **yes** | — | server credential |
| `OPENROUTER_REFERER` | no | `https://nosion.rahmanef.com` | analytics tag for OpenRouter |
| `OPENROUTER_APP_NAME` | no | `Nosion` | analytics tag |

`ANTHROPIC_API_KEY` is no longer read (cycle-2). Don't set it.

---

## Frontend integration

### `SelectionToolbar` AI dropdown

`frontend/slices/editor/components/SelectionToolbar.tsx`. Five
preset actions:

| preset | system prompt summary |
|---|---|
| `improve` | rewrite for clarity + concision |
| `shorter` | shorten while preserving meaning |
| `longer` | expand with relevant detail |
| `grammar` | correct grammar/spelling, preserve voice |
| `translate` | translate to English (or Indonesian if already English) |

Each preset calls `complete({messages: [{role: "user", content: selectedText}], system, maxTokens: 1024})`,
then in-place replaces the selection with the response.

### `AIAssistDialog`

Generates database schema + rows from natural language. Calls
`complete` with a structured-output prompt, parses the JSON response,
applies via `databases.update + databases.addRow`. Implementation in
`frontend/slices/ai-agent/`.

### `<ChatBox>` / general assistant

Used by the AI panel. Streams responses by polling? — actually no,
the action is non-streaming. The user waits for the full completion.
Streaming is a future enhancement (would need an HTTP endpoint, not
an action).

---

## Cost discipline

- **Default model**: `anthropic/claude-haiku-4.5` — cheap, ~$0.25/1M
  input tokens, ~$1.25/1M output tokens at the time of cycle-2
  pinning.
- **Rate limit**: 20 calls/hour/user. With ~1 000 input + 500 output
  tokens per call and the haiku price, the worst case is ~$0.001 per
  call → $0.02/hr/user → $14/mo for one heavily-using user. Acceptable.
- **Input cap**: 60 KB chars hard. Translation of a long doc would
  need to chunk client-side.

If you raise the rate limit or default to a more expensive model,
update this section so ops knows the cost profile changed.

---

## Conventions

1. **Always wrap with `try/catch + reportError + toast`** — AI calls
   can fail for many reasons (rate limit, upstream timeout, empty
   response). The frontend `SelectionToolbar` AI handler is the
   reference pattern.
2. **System prompt is opinionated** — ours says "output only the
   rewritten text, no commentary, no markdown wrappers." Don't
   assume the model will follow it 100% — strip code-fence wrappers
   defensively if you parse output as code.
3. **Model is a parameter** — don't hard-code. Future BYOK could
   pass a per-user model.
4. **Don't expose the Convex action directly to anonymous users** —
   the auth gate is non-negotiable. If you want a public AI surface,
   create a separate action behind its own rate limit + abuse
   monitoring.
5. **Streaming is not implemented** — if you need it, design an HTTP
   endpoint (Convex `httpAction`), not an action. Actions buffer the
   full response before returning.
