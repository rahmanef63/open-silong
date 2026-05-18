/** MCP JSON-RPC 2.0 endpoint (`POST /mcp`).
 *
 *  Spec-compliant transport for ChatGPT custom apps + any client that
 *  speaks the Model Context Protocol. Separate from the legacy
 *  Notion-canonical surface at `/mcp/v1` (which uses a `{tool, args}`
 *  body shape and stays around for our own scripts).
 *
 *  Phase 1 here = BEARER ONLY. OAuth 2.1 + PKCE wraps this in Phase 2.
 *
 *  Methods implemented:
 *    initialize → handshake
 *    ping → empty result
 *    tools/list → curated tool catalog
 *    tools/call → dispatch by tool name
 *    notifications/* → ack (return 202)
 *
 *  Tool result shape: `{ content: [{ type: "text", text }], isError?: boolean }`.
 *  Errors stay INSIDE result.isError per MCP spec — ChatGPT hides
 *  protocol-level `error` from the user.
 */

import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { sha256Hex } from "../_shared/hash";
import { markdownToBlocks } from "../_shared/markdown";

const PROTOCOL_VERSION = "2024-11-05";

// ───────────────────────── auth ─────────────────────────

async function authenticate(
  ctx: ActionCtx,
  req: Request,
): Promise<
  | { userId: Id<"users">; tokenId?: Id<"mcpTokens">; oauthId?: Id<"oauthAccessTokens"> }
  | { error: number; message: string }
> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return { error: 401, message: "Missing Bearer token" };
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return { error: 401, message: "Empty token" };

  // 1. Per-user issued nsn_ tokens (preferred for scripts).
  if (token.startsWith("nsn_")) {
    const tokenHash = await sha256Hex(token);
    const found = await ctx.runQuery(internal.mcp.tokens.lookupByHash, { tokenHash });
    if (!found) return { error: 401, message: "Invalid or revoked token" };
    return { userId: found.userId, tokenId: found.id };
  }

  // 2. OAuth 2.1 access tokens minted via /oauth/authorize → /api/oauth/token.
  //    ChatGPT custom-app sends these.
  const oauthRow = await ctx.runQuery(internal.oauth.queries.findToken, { token });
  if (oauthRow) {
    // Best-effort touch — never block dispatch on the bookkeeping write.
    void ctx.runMutation(internal.oauth.mutations.touchToken, { id: oauthRow.id }).catch(() => {});
    return { userId: oauthRow.userId, oauthId: oauthRow.id };
  }

  // 3. Env single-tenant fallback. Set MCP_API_KEY + MCP_USER_ID on
  //    the Convex deployment to enable this (smoke tests, internal scripts).
  const expected = process.env.MCP_API_KEY ?? process.env.MCP_API_TOKEN;
  const userIdEnv = process.env.MCP_USER_ID;
  if (!expected || !userIdEnv) {
    return { error: 401, message: "Invalid token" };
  }
  // Constant-time-ish compare via length gate.
  if (token.length !== expected.length || token !== expected) {
    return { error: 401, message: "Invalid token" };
  }
  return { userId: userIdEnv as Id<"users"> };
}

// ─────────────────────── tool catalog ───────────────────────

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object" as const,
  properties,
  required,
  additionalProperties: false,
});

const TOOLS: ToolDef[] = [
  {
    name: "pages_list",
    description: "List pages in the user's workspace. Returns id, title, icon, parentId, blockCount, updatedAt. Use BEFORE pages_get when the user references a page by topic. Up to 80 results.",
    inputSchema: obj({}),
    annotations: { readOnlyHint: true },
  },
  {
    name: "pages_search",
    description: "Full-text search across the user's pages by title + body. Pass a 1-200 char query. Returns up to 20 matches with id + title.",
    inputSchema: obj({ query: { type: "string", description: "Search query" } }, ["query"]),
    annotations: { readOnlyHint: true },
  },
  {
    name: "pages_get",
    description: "Read one page's full content (title + block list). Pass the pageId from pages_list or pages_search.",
    inputSchema: obj({ pageId: { type: "string" } }, ["pageId"]),
    annotations: { readOnlyHint: true },
  },
  {
    name: "pages_append_markdown",
    description: "Append markdown content to the END of a page. Headings, lists, tables, todos, callouts, fenced code all parse into proper blocks. Pass the pageId from pages_list or pages_search.",
    inputSchema: obj({
      pageId: { type: "string" },
      markdown: { type: "string", description: "Markdown to append" },
    }, ["pageId", "markdown"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  {
    name: "pages_create",
    description: "Create a new page in the workspace. Optional parentId nests it. Returns the new pageId.",
    inputSchema: obj({
      title: { type: "string" },
      parentId: { type: "string", description: "Optional parent pageId" },
      icon: { type: "string", description: "Optional emoji icon" },
    }, ["title"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  {
    name: "pages_set_title",
    description: "Rename a page (set title only). Idempotent — calling twice with the same title is safe.",
    inputSchema: obj({
      pageId: { type: "string" },
      title: { type: "string", description: "New title, max 200 chars" },
    }, ["pageId", "title"]),
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  {
    name: "pages_set_icon",
    description: "Set the page icon (single emoji). Idempotent.",
    inputSchema: obj({
      pageId: { type: "string" },
      icon: { type: "string", description: "Emoji, e.g. 📝 or 📁" },
    }, ["pageId", "icon"]),
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  {
    name: "pages_replace_blocks",
    description: "REPLACE the entire content of a page with new markdown. Existing blocks are dropped. Use this to OVERWRITE — for incremental append use pages_append_markdown.",
    inputSchema: obj({
      pageId: { type: "string" },
      markdown: { type: "string", description: "Markdown body that replaces current page content" },
    }, ["pageId", "markdown"]),
    annotations: { destructiveHint: true, idempotentHint: false },
  },
  {
    name: "pages_trash",
    description: "Move a page to trash (soft-delete). Page stays recoverable for 30 days via /dashboard/trash, then auto-purged. NOT permanent delete.",
    inputSchema: obj({ pageId: { type: "string" } }, ["pageId"]),
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  {
    name: "pages_duplicate",
    description: "Duplicate a page (copy of title + blocks). Returns the new pageId.",
    inputSchema: obj({ pageId: { type: "string" } }, ["pageId"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
];

// ─────────────────────── tool dispatch ───────────────────────

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

const textResult = (data: unknown, isError = false): ToolResult => ({
  content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
  ...(isError ? { isError: true } : {}),
});

const errResult = (msg: string): ToolResult => textResult({ error: msg }, true);

async function dispatchTool(
  ctx: ActionCtx,
  userId: Id<"users">,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  // Internal queries/mutations enforce ownership via the userId arg
  // (Convex auth context is empty for MCP since auth is bearer-
  // resolved upstream in this file). Pass the bearer-resolved
  // userId through.
  switch (name) {
    case "pages_list": {
      // Internal returns { items, nextCursor, total } and requires
      // userId. Old dispatcher used { results, cursor } shape that
      // never existed — broke silently with "rows.results undefined"
      // when ChatGPT first called it.
      const rows = await ctx.runQuery(internal.mcp.internal.listPages, {
        userId, pageSize: 80,
      });
      return textResult({
        pages: rows.items.map((p) => ({
          pageId: p._id,
          title: p.title,
          icon: p.icon,
          parentId: p.parentId,
          updatedAt: p.updatedAt,
          blockCount: Array.isArray(p.blocks) ? p.blocks.length : 0,
        })),
        nextCursor: rows.nextCursor,
        total: rows.total,
      });
    }
    case "pages_search": {
      const q = String(args.query ?? "").slice(0, 200);
      if (!q) return errResult("query is required");
      const rows = await ctx.runQuery(internal.mcp.internal.searchPages, {
        userId, query: q, limit: 20,
      });
      return textResult({
        results: rows.map((p) => ({
          pageId: p._id,
          title: p.title,
          snippet: (p.searchText ?? "").slice(0, 200),
        })),
      });
    }
    case "pages_get": {
      const pageId = String(args.pageId ?? "");
      if (!pageId) return errResult("pageId is required");
      const doc = await ctx.runQuery(internal.mcp.internal.fetchPage, {
        userId, pageId,
      });
      if (!doc) return errResult("Page not found or unauthorized");
      return textResult({
        pageId: doc._id,
        title: doc.title,
        icon: doc.icon,
        blocks: (doc.blocks ?? []).slice(0, 300).map((b: { type: string; text?: string; checked?: boolean }) => ({
          type: b.type,
          text: b.text ?? "",
          ...(b.checked !== undefined ? { checked: b.checked } : {}),
        })),
      });
    }
    case "pages_append_markdown": {
      const pageId = String(args.pageId ?? "");
      const markdown = String(args.markdown ?? "");
      if (!pageId) return errResult("pageId is required");
      if (!markdown) return errResult("markdown is required");
      try {
        // Internal mutation — public api.pages.appendMarkdown calls
        // requireAuth which throws "Belum login" since MCP has no
        // Convex session (auth is bearer-resolved upstream).
        const inserted = await ctx.runMutation(internal.mcp.internal.appendMarkdownAs, {
          userId, pageId, markdown,
        });
        return textResult({ ok: true, blocksInserted: inserted });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "pages_create": {
      const title = String(args.title ?? "Untitled");
      const parentIdStr = String(args.parentId ?? "");
      const icon = String(args.icon ?? "") || "📄";
      try {
        const newId = await ctx.runMutation(internal.mcp.internal.createPage, {
          userId,
          parentId: parentIdStr || null,
          title, icon,
        });
        return textResult({ ok: true, pageId: newId });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "pages_set_title": {
      const pageId = String(args.pageId ?? "");
      const title = String(args.title ?? "");
      if (!pageId) return errResult("pageId is required");
      try {
        await ctx.runMutation(internal.mcp.internal.setTitleAs, { userId, pageId, title });
        return textResult({ ok: true });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "pages_set_icon": {
      const pageId = String(args.pageId ?? "");
      const icon = String(args.icon ?? "");
      if (!pageId) return errResult("pageId is required");
      if (!icon) return errResult("icon is required");
      try {
        await ctx.runMutation(internal.mcp.internal.setIconAs, { userId, pageId, icon });
        return textResult({ ok: true });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "pages_replace_blocks": {
      const pageId = String(args.pageId ?? "");
      const markdown = String(args.markdown ?? "");
      if (!pageId) return errResult("pageId is required");
      try {
        const blocks = markdownToBlocks(markdown);
        await ctx.runMutation(internal.mcp.internal.updatePage, {
          userId, pageId, patch: { blocks },
        });
        return textResult({ ok: true, blocksInserted: blocks.length });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "pages_trash": {
      const pageId = String(args.pageId ?? "");
      if (!pageId) return errResult("pageId is required");
      try {
        await ctx.runMutation(internal.mcp.internal.trashPage, { userId, pageId });
        return textResult({ ok: true });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "pages_duplicate": {
      const pageId = String(args.pageId ?? "");
      if (!pageId) return errResult("pageId is required");
      try {
        const newId = await ctx.runMutation(internal.mcp.internal.duplicatePage, { userId, pageId });
        return textResult({ ok: true, pageId: newId });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    default:
      return errResult(`Unknown tool: ${name}`);
  }
}

// ─────────────────────── JSON-RPC dispatcher ───────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const ERR_PARSE = -32700;
const ERR_INVALID_REQUEST = -32600;
const ERR_METHOD_NOT_FOUND = -32601;
const ERR_INVALID_PARAMS = -32602;
const ERR_INTERNAL = -32603;

async function dispatchRpc(
  ctx: ActionCtx,
  userId: Id<"users">,
  req: JsonRpcRequest,
): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;
  // Notifications have no id → return null → 202 No Content.
  const isNotification = req.id == null;

  switch (req.method) {
    case "initialize": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "nosion-mcp", version: "1.0.0" },
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "notifications/initialized":
    case "notifications/cancelled":
      return isNotification ? null : { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
    case "tools/call": {
      const params = (req.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
      const name = String(params.name ?? "");
      if (!name) {
        return { jsonrpc: "2.0", id, error: { code: ERR_INVALID_PARAMS, message: "Missing tool name" } };
      }
      const args = params.arguments ?? {};
      try {
        const result = await dispatchTool(ctx, userId, name, args);
        return { jsonrpc: "2.0", id, result };
      } catch (e) {
        // Tool exceptions still come back as isError inside result so
        // ChatGPT shows them to the user.
        return {
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: `Tool ${name} threw: ${e instanceof Error ? e.message : String(e)}` }], isError: true },
        };
      }
    }
    default:
      if (isNotification) return null;
      return { jsonrpc: "2.0", id, error: { code: ERR_METHOD_NOT_FOUND, message: `Unknown method: ${req.method}` } };
  }
}

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, mcp-protocol-version",
} as const;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });

export const mcpRpcHandler = httpAction(async (ctx, req) => {
  // Auth gate.
  const a = await authenticate(ctx, req);
  if ("error" in a) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0", id: null,
      error: { code: a.error, message: a.message },
    }), {
      status: a.error,
      headers: {
        "content-type": "application/json",
        ...CORS_HEADERS,
        "www-authenticate": 'Bearer realm="nosion-mcp", resource_metadata="https://nosion.rahmanef.com/.well-known/oauth-protected-resource"',
      },
    });
  }

  // Body parse.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: ERR_PARSE, message: "Parse error" } }, 400);
  }

  // Batch support per JSON-RPC 2.0 §6.
  if (Array.isArray(body)) {
    const responses: JsonRpcResponse[] = [];
    for (const item of body) {
      if (!item || typeof item !== "object" || (item as { jsonrpc?: string }).jsonrpc !== "2.0") {
        responses.push({ jsonrpc: "2.0", id: null, error: { code: ERR_INVALID_REQUEST, message: "Invalid request" } });
        continue;
      }
      try {
        const r = await dispatchRpc(ctx, a.userId, item as JsonRpcRequest);
        if (r) responses.push(r);
      } catch (e) {
        responses.push({
          jsonrpc: "2.0", id: (item as JsonRpcRequest).id ?? null,
          error: { code: ERR_INTERNAL, message: e instanceof Error ? e.message : String(e) },
        });
      }
    }
    if (responses.length === 0) return new Response(null, { status: 202, headers: CORS_HEADERS });
    return json(responses);
  }

  // Single request.
  if (!body || typeof body !== "object" || (body as { jsonrpc?: string }).jsonrpc !== "2.0") {
    return json({ jsonrpc: "2.0", id: null, error: { code: ERR_INVALID_REQUEST, message: "Invalid request" } }, 400);
  }
  const r = await dispatchRpc(ctx, a.userId, body as JsonRpcRequest);
  if (!r) return new Response(null, { status: 202, headers: CORS_HEADERS });
  return json(r);
});
