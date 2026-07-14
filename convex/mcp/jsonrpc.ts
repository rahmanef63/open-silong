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
import { pageMetaOf } from "../_shared/pageContent";

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
    description: "List pages in the user's workspace. Returns pageId, title, icon, parentId, blockCount, updatedAt + nextCursor for pagination. Use BEFORE pages_get when the user references a page by topic. Default 80/page, max 100.",
    inputSchema: obj({
      cursor: { type: "number", description: "Pagination cursor from a previous nextCursor (0-based offset)" },
      limit: { type: "number", description: "Max items per page, 1..100, default 80" },
    }),
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
    description: "Append markdown content to the END of a page. Headings, lists, todos, callouts, fenced code all parse into proper blocks. NOTE: markdown tables (| col1 | col2 |) become STATIC table blocks — when the user wants a real database (filter / sort / view) call databases_create_inline instead. For side-by-side layout (Mon/Tue/Wed, pros/cons, etc.) use pages_append_columns, not stacked vertical lists.",
    inputSchema: obj({
      pageId: { type: "string" },
      markdown: { type: "string", description: "Markdown to append" },
    }, ["pageId", "markdown"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  {
    name: "pages_create",
    description: "Create a new page in the workspace. Optional parentId nests it. Optional markdown fills the body in the same call (skips a follow-up pages_append_markdown). Returns the new pageId + appendedBlockCount.",
    inputSchema: obj({
      title: { type: "string" },
      parentId: { type: "string", description: "Optional parent pageId" },
      icon: { type: "string", description: "Optional emoji icon" },
      markdown: { type: "string", description: "Optional initial body — same parser as pages_append_markdown" },
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
  {
    name: "pages_embed_database",
    description: "Embed an EXISTING database as an inline block at the end of a page. The database is rendered with its rows + view, just like a Notion 'inline database'. Pass the dbId from databases_list/create. Use this AFTER databases_create when the user wants the table to live inside a specific page. DO NOT use markdown table syntax — that creates a static table block, NOT a real database.",
    inputSchema: obj({
      pageId: { type: "string" },
      dbId: { type: "string" },
    }, ["pageId", "dbId"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  {
    name: "pages_append_columns",
    description: "Append a SIDE-BY-SIDE COLUMNS section. Pass 2–4 columns, each a markdown string. Use this whenever the content is naturally parallel (e.g. pros vs cons, Mon/Tue/Wed schedule, before/after, summary + details). DEFAULT to columns for any list-of-N comparable items instead of stacking vertically. Each column markdown supports the full block grammar (headings, lists, callouts, todos, code, tables).",
    inputSchema: obj({
      pageId: { type: "string" },
      columns: {
        type: "array",
        items: { type: "string" },
        description: "2..4 markdown strings, one per column",
      },
      widths: {
        type: "array",
        items: { type: "number" },
        description: "Optional flex weights, must match columns.length. Defaults to equal widths.",
      },
    }, ["pageId", "columns"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },

  // ── Database surface (Notion-style: schema + rows = pages) ──────────
  {
    name: "databases_list",
    description: "List user's databases. Returns dbId, name, icon, propertyCount, rowCount, updatedAt.",
    inputSchema: obj({}),
    annotations: { readOnlyHint: true },
  },
  {
    name: "databases_get",
    description: "Get one database with full schema (properties) + view ids + row count. Pass dbId from databases_list. Use BEFORE database_rows_create so you know the property names and types.",
    inputSchema: obj({ dbId: { type: "string" } }, ["dbId"]),
    annotations: { readOnlyHint: true },
  },
  {
    name: "databases_rows",
    description: "List rows in a database with pagination. Each row is a page — `rowProps` is keyed by property NAME. Returns up to 100/page.",
    inputSchema: obj({
      dbId: { type: "string" },
      cursor: { type: "number", description: "0-based offset" },
      limit: { type: "number", description: "1..100, default 50" },
    }, ["dbId"]),
    annotations: { readOnlyHint: true },
  },
  {
    name: "databases_create_inline",
    description: "ONE-SHOT: create a Notion-style database AND embed it as an inline block at the end of an existing page. Use this when the user says 'tambahkan database / table / tracker DI halaman ini' — NOT pages_append_markdown with a markdown table (which creates a static table block, NOT a real database). Same `properties` shape as databases_create. Returns dbId + the embed blockId.",
    inputSchema: obj({
      pageId: { type: "string" },
      name: { type: "string" },
      icon: { type: "string", description: "Optional emoji icon" },
      properties: {
        type: "object",
        description: 'Schema by NAME. e.g. { "Name": {"type":"title"}, "Status": {"type":"status","options":["Todo","Done"]} }',
        additionalProperties: true,
      },
    }, ["pageId", "name"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  {
    name: "databases_create",
    description: "Create a new Notion-style database as a TOP-LEVEL entity (no parent page). Use databases_create_inline instead when the user wants the DB inside a specific page. `properties` is an object keyed by property NAME — each value declares `type` + optional `options` (for select/status/multi_select). Supported types: text, title (alias of text), number, select, multi_select, status, date, checkbox, url, email, phone. Returns the new dbId.",
    inputSchema: obj({
      name: { type: "string" },
      icon: { type: "string", description: "Optional emoji icon" },
      properties: {
        type: "object",
        description: 'Schema by NAME. e.g. { "Name": {"type":"title"}, "Status": {"type":"status","options":["Todo","Done"]}, "Date": {"type":"date"} }',
        additionalProperties: true,
      },
    }, ["name"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  {
    name: "databases_set_name",
    description: "Rename a database. Idempotent.",
    inputSchema: obj({
      dbId: { type: "string" },
      name: { type: "string" },
    }, ["dbId", "name"]),
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  {
    name: "databases_set_schema",
    description: "Add new properties to a database (merge — does not remove existing). `properties` keyed by NAME, same shape as databases_create.",
    inputSchema: obj({
      dbId: { type: "string" },
      properties: { type: "object", additionalProperties: true },
    }, ["dbId", "properties"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  {
    name: "databases_trash",
    description: "Soft-delete a database. Recoverable from /dashboard/trash for 30 days, then permanently purged.",
    inputSchema: obj({ dbId: { type: "string" } }, ["dbId"]),
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  {
    name: "database_rows_create",
    description: "Insert a row into a database. `properties` is keyed by property NAME (case-sensitive, matches databases_get). Values are coerced to the property type. Returns the new pageId of the row.",
    inputSchema: obj({
      dbId: { type: "string" },
      properties: {
        type: "object",
        description: 'By NAME. e.g. { "Name": "Buy milk", "Status": "Todo", "Date": "2026-05-20" }',
        additionalProperties: true,
      },
    }, ["dbId", "properties"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  {
    name: "database_rows_update",
    description: "Patch property values on an existing row. Pass only the properties you want to change. Other properties remain. Use pageId from databases_rows.",
    inputSchema: obj({
      pageId: { type: "string" },
      properties: {
        type: "object",
        description: 'By NAME. Partial update.',
        additionalProperties: true,
      },
    }, ["pageId", "properties"]),
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  {
    name: "database_rows_trash",
    description: "Soft-delete a database row (same as pages_trash, named for symmetry).",
    inputSchema: obj({ pageId: { type: "string" } }, ["pageId"]),
    annotations: { destructiveHint: true, idempotentHint: true },
  },

  // ── Memory graph (Obsidian-style knowledge graph = agent memory) ────
  // READ: traverse the graph before answering questions that depend on
  // how notes relate. WRITE: grow the graph as durable memory.
  {
    name: "graph_backlinks",
    description: "List the notes that LINK TO this page (incoming links). Call this when the user asks 'what references / points to / mentions this note', or before summarizing a topic so you gather everything that cites it. Pass the pageId from pages_search / pages_list. Returns each source page's id, title, icon, link kind, and the block it lives in.",
    inputSchema: obj({ pageId: { type: "string" } }, ["pageId"]),
    annotations: { readOnlyHint: true },
  },
  {
    name: "graph_links",
    description: "List the OUTGOING links from this page — resolved page links, unresolved [[ghost]] links (a title with no page yet), and #tags. Call this to see what a note connects out to before following a train of thought. Pass the pageId. Returns kind, resolved flag, target pageId/title, and tag.",
    inputSchema: obj({ pageId: { type: "string" } }, ["pageId"]),
    annotations: { readOnlyHint: true },
  },
  {
    name: "graph_neighbors",
    description: "Get the LOCAL subgraph around a page — every node reachable within `depth` hops (default 1, max 3). Call this to explore a note's neighbourhood / immediate context. Returns { nodes, edges } where node id = pageId, 'ghost:<slug>' for unresolved links, or 'tag:<tag>'.",
    inputSchema: obj({
      pageId: { type: "string" },
      depth: { type: "number", description: "Hops from the page, 1..3, default 1" },
    }, ["pageId"]),
    annotations: { readOnlyHint: true },
  },
  {
    name: "graph_global",
    description: "Get the WHOLE memory graph (all the user's notes + how they connect). Call this to understand the overall structure of the knowledge base, find clusters, or pick where new information belongs. Returns { nodes, edges }, highest-degree nodes first, capped by `limit`. Set includeTags:true to include #tag nodes.",
    inputSchema: obj({
      limit: { type: "number", description: "Max nodes, 1..2000, default 500 (keeps highest-degree)" },
      includeTags: { type: "boolean", description: "Include #tag nodes + tag edges (default false)" },
    }),
    annotations: { readOnlyHint: true },
  },
  {
    name: "graph_tags",
    description: "List every #tag in the knowledge base with a page count. Call this to discover how notes are categorized before filtering by tag or choosing a tag for a new note. Returns [{ tag, count }] sorted by count.",
    inputSchema: obj({}),
    annotations: { readOnlyHint: true },
  },
  {
    name: "graph_by_tag",
    description: "List the notes carrying a given #tag. Call this when the user references a topic by tag (e.g. 'my #project notes'). Pass the tag WITHOUT the leading # (both accepted). Returns [{ pageId, title, icon }].",
    inputSchema: obj({ tag: { type: "string", description: "Tag name, with or without leading #" } }, ["tag"]),
    annotations: { readOnlyHint: true },
  },
  {
    name: "graph_unlinked_mentions",
    description: "Find notes that mention this page's TITLE in their text but don't actually link to it. Call this to surface link opportunities the user missed, or to gather context that isn't formally connected yet. Pass the pageId. Returns [{ pageId, title, icon, snippet }].",
    inputSchema: obj({ pageId: { type: "string" } }, ["pageId"]),
    annotations: { readOnlyHint: true },
  },
  {
    name: "graph_related",
    description: "Find notes RELATED to this page by shared tags and co-citation (2-hop neighbours), ranked by connectedness. Call this for recall — 'what else do I know that's relevant to this note'. Pass the pageId. Returns [{ pageId, title, icon, direct, score }].",
    inputSchema: obj({ pageId: { type: "string" } }, ["pageId"]),
    annotations: { readOnlyHint: true },
  },
  {
    name: "note_create_linked",
    description: "Create a new note ALREADY WIRED into the graph. Use this instead of pages_create when the new note should connect to existing knowledge: pass `links` (titles to [[wikilink]] out to) and `tags` (added as #tags) and they are appended + indexed so backlinks/graph queries see them immediately. `markdown` fills the body. Returns the new pageId.",
    inputSchema: obj({
      title: { type: "string" },
      markdown: { type: "string", description: "Optional note body (same markdown parser as pages_append_markdown)" },
      links: { type: "array", items: { type: "string" }, description: "Titles to link out to as [[wikilinks]] (# or [[ ]] stripped automatically)" },
      tags: { type: "array", items: { type: "string" }, description: "Tags to add as #tags (leading # optional)" },
      icon: { type: "string", description: "Optional emoji icon" },
    }, ["title"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  {
    name: "note_link",
    description: "Add a [[wikilink]] FROM one note TO another. Call this to connect two existing notes when you notice a relationship. `to` may be a pageId (linked by that page's title so it resolves) or a plain title (a ghost link until such a page exists). Optional `alias` sets the displayed text ([[Title|alias]]). Reindexes the source so graph_backlinks sees it.",
    inputSchema: obj({
      fromPageId: { type: "string", description: "The note the link is added to" },
      to: { type: "string", description: "Target pageId or note title" },
      alias: { type: "string", description: "Optional display text for the link" },
    }, ["fromPageId", "to"]),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  {
    name: "note_tag",
    description: "Add a #tag to a note. Call this to categorize a note so graph_by_tag / graph_tags surface it. Pass the tag with or without the leading #. Idempotent — tagging with a tag the note already has is a no-op.",
    inputSchema: obj({
      pageId: { type: "string" },
      tag: { type: "string", description: "Tag name, with or without leading #" },
    }, ["pageId", "tag"]),
    annotations: { destructiveHint: false, idempotentHint: true },
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
      // userId. cursor/limit pass through so the tool's tool-schema
      // promise of pagination actually works.
      const rawCursor = args.cursor;
      const cursor = typeof rawCursor === "number" && rawCursor >= 0 ? rawCursor : 0;
      const rawLimit = args.limit;
      const limit = typeof rawLimit === "number" ? Math.min(Math.max(Math.floor(rawLimit), 1), 100) : 80;
      const rows = await ctx.runQuery(internal.mcp.internal.listPages, {
        userId, pageSize: limit, cursor,
      });
      return textResult({
        pages: rows.items.map((p) => ({
          pageId: p._id,
          title: p.title,
          icon: p.icon,
          parentId: p.parentId,
          updatedAt: p.updatedAt,
          blockCount: pageMetaOf(p).blockCount,
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
        const appendedBlockCount = await ctx.runMutation(internal.mcp.internal.appendMarkdownAs, {
          userId, pageId, markdown,
        });
        return textResult({ ok: true, pageId, appendedBlockCount });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "pages_create": {
      const title = String(args.title ?? "Untitled");
      const parentIdStr = String(args.parentId ?? "");
      const icon = String(args.icon ?? "") || "📄";
      const markdown = typeof args.markdown === "string" ? args.markdown : "";
      try {
        const newId = await ctx.runMutation(internal.mcp.internal.createPage, {
          userId,
          parentId: parentIdStr || null,
          title, icon,
        });
        // Same-call body fill — skips a follow-up round-trip + avoids the
        // pages_create → pages_get → pages_append_markdown chain that
        // tripped ChatGPT when intermediate calls failed.
        let appendedBlockCount = 0;
        if (markdown.trim()) {
          appendedBlockCount = await ctx.runMutation(internal.mcp.internal.appendMarkdownAs, {
            userId, pageId: String(newId), markdown,
          });
        }
        return textResult({ ok: true, pageId: newId, appendedBlockCount });
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
        return textResult({ ok: true, pageId, replacedBlockCount: blocks.length });
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
    case "pages_embed_database": {
      const pageId = String(args.pageId ?? "");
      const dbId = String(args.dbId ?? "");
      if (!pageId || !dbId) return errResult("pageId + dbId required");
      try {
        const r = await ctx.runMutation(internal.mcp.internal.embedDatabaseAs, { userId, pageId, dbId });
        return textResult({ ok: true, pageId, dbId, blockId: r.blockId });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "pages_append_columns": {
      const pageId = String(args.pageId ?? "");
      const cols = Array.isArray(args.columns) ? args.columns.map((c) => String(c ?? "")) : [];
      const widths = Array.isArray(args.widths) ? args.widths.map((w) => Number(w)).filter((n) => Number.isFinite(n)) : undefined;
      if (!pageId) return errResult("pageId is required");
      if (cols.length < 2 || cols.length > 4) return errResult("columns must be 2..4 entries");
      try {
        const r = await ctx.runMutation(internal.mcp.internal.appendColumnsAs, {
          userId, pageId, columns: cols, widths,
        });
        return textResult({ ok: true, pageId, layoutId: r.layoutId, blocksInserted: r.blocksInserted });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }

    // ── Database tools ─────────────────────────────────────────────
    case "databases_list": {
      const rows = await ctx.runQuery(internal.mcp.internal.listDatabases, { userId });
      return textResult({
        databases: rows.map((d) => ({
          dbId: d._id,
          name: d.name,
          icon: d.icon,
          propertyCount: (d.properties ?? []).length,
          rowCount: (d.rowIds ?? []).length,
          updatedAt: d.updatedAt,
        })),
      });
    }
    case "databases_get": {
      const dbId = String(args.dbId ?? "");
      if (!dbId) return errResult("dbId is required");
      const doc = await ctx.runQuery(internal.mcp.internal.fetchDatabase, { userId, dbId });
      if (!doc) return errResult("Database not found or unauthorized");
      return textResult({
        dbId: doc._id,
        name: doc.name,
        icon: doc.icon,
        rowCount: (doc.rowIds ?? []).length,
        properties: (doc.properties ?? []).map((p: { id: string; name: string; type: string; options?: unknown }) => ({
          id: p.id, name: p.name, type: p.type,
          ...(p.options ? { options: p.options } : {}),
        })),
        views: (doc.views ?? []).map((v: { id: string; name: string; type: string }) => ({
          id: v.id, name: v.name, type: v.type,
        })),
      });
    }
    case "databases_rows": {
      const dbId = String(args.dbId ?? "");
      if (!dbId) return errResult("dbId is required");
      const rawCursor = args.cursor;
      const cursor = typeof rawCursor === "number" && rawCursor >= 0 ? rawCursor : 0;
      const rawLimit = args.limit;
      const limit = typeof rawLimit === "number" ? Math.min(Math.max(Math.floor(rawLimit), 1), 100) : 50;
      const { items, nextCursor, total } = await ctx.runQuery(internal.mcp.internal.listRows, {
        userId, dbId, cursor, pageSize: limit,
      });
      // Need property id→name map so we can return rowProps keyed by NAME
      // (id is internal — the LLM has zero use for the uid).
      const db = await ctx.runQuery(internal.mcp.internal.fetchDatabase, { userId, dbId });
      const idToName = new Map<string, string>();
      for (const p of (db?.properties ?? []) as Array<{ id: string; name: string }>) {
        idToName.set(p.id, p.name);
      }
      const remap = (props: Record<string, unknown>): Record<string, unknown> => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(props ?? {})) {
          out[idToName.get(k) ?? k] = v;
        }
        return out;
      };
      return textResult({
        rows: items.map((r) => ({
          pageId: r._id,
          title: r.title,
          rowProps: remap((r.rowProps ?? {}) as Record<string, unknown>),
          updatedAt: r.updatedAt,
        })),
        nextCursor, total,
      });
    }
    case "databases_create": {
      const name = String(args.name ?? "Untitled database");
      const icon = typeof args.icon === "string" && args.icon ? args.icon : undefined;
      const properties = buildPropertiesArray(args.properties);
      try {
        const dbId = await ctx.runMutation(internal.mcp.internal.createDatabase, {
          userId, name, icon, properties,
        });
        return textResult({ ok: true, dbId });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "databases_create_inline": {
      const pageId = String(args.pageId ?? "");
      const name = String(args.name ?? "Untitled database");
      const icon = typeof args.icon === "string" && args.icon ? args.icon : undefined;
      const properties = buildPropertiesArray(args.properties);
      if (!pageId) return errResult("pageId is required");
      try {
        const dbId = await ctx.runMutation(internal.mcp.internal.createDatabase, {
          userId, name, icon, properties,
        });
        const r = await ctx.runMutation(internal.mcp.internal.embedDatabaseAs, {
          userId, pageId, dbId: String(dbId),
        });
        return textResult({ ok: true, pageId, dbId, blockId: r.blockId });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "databases_set_name": {
      const dbId = String(args.dbId ?? "");
      const name = String(args.name ?? "");
      if (!dbId || !name) return errResult("dbId + name required");
      try {
        await ctx.runMutation(internal.mcp.internal.updateDatabase, {
          userId, dbId, patch: { name },
        });
        return textResult({ ok: true, dbId });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "databases_set_schema": {
      const dbId = String(args.dbId ?? "");
      if (!dbId) return errResult("dbId is required");
      const newProps = buildPropertiesArray(args.properties);
      if (!newProps.length) return errResult("properties required");
      try {
        const db = await ctx.runQuery(internal.mcp.internal.fetchDatabase, { userId, dbId });
        if (!db) return errResult("Database not found or unauthorized");
        const existingNames = new Set((db.properties ?? []).map((p: { name: string }) => p.name));
        const merged = [...db.properties, ...newProps.filter((p) => !existingNames.has(p.name))];
        await ctx.runMutation(internal.mcp.internal.updateDatabase, {
          userId, dbId, patch: { properties: merged },
        });
        return textResult({ ok: true, dbId, propertyCount: merged.length });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "databases_trash": {
      const dbId = String(args.dbId ?? "");
      if (!dbId) return errResult("dbId is required");
      try {
        await ctx.runMutation(internal.mcp.internal.updateDatabase, {
          userId, dbId, patch: { trashed: true },
        });
        return textResult({ ok: true, dbId });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "database_rows_create": {
      const dbId = String(args.dbId ?? "");
      if (!dbId) return errResult("dbId is required");
      const propsInput = (args.properties ?? {}) as Record<string, unknown>;
      try {
        const db = await ctx.runQuery(internal.mcp.internal.fetchDatabase, { userId, dbId });
        if (!db) return errResult("Database not found or unauthorized");
        const { rowProps, title } = mapPropsByName(db.properties as Array<{ id: string; name: string; type: string }>, propsInput);
        const rowId = await ctx.runMutation(internal.mcp.internal.createRow, {
          userId, dbId, rowProps, title,
        });
        return textResult({ ok: true, pageId: rowId });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "database_rows_update": {
      const pageId = String(args.pageId ?? "");
      if (!pageId) return errResult("pageId is required");
      const propsInput = (args.properties ?? {}) as Record<string, unknown>;
      try {
        // Need the parent db schema to map name→id. Fetch the row,
        // then its database.
        const row = await ctx.runQuery(internal.mcp.internal.fetchPage, { userId, pageId });
        if (!row || !row.rowOfDatabaseId) return errResult("Page is not a database row");
        const db = await ctx.runQuery(internal.mcp.internal.fetchDatabase, {
          userId, dbId: row.rowOfDatabaseId,
        });
        if (!db) return errResult("Parent database not found");
        const { rowProps, title } = mapPropsByName(db.properties as Array<{ id: string; name: string; type: string }>, propsInput);
        await ctx.runMutation(internal.mcp.internal.updateRow, {
          userId, rowPageId: pageId, rowProps,
        });
        // Title is a separate field on the page, not in rowProps.
        if (title !== undefined) {
          await ctx.runMutation(internal.mcp.internal.setTitleAs, {
            userId, pageId, title,
          });
        }
        return textResult({ ok: true, pageId });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "database_rows_trash": {
      const pageId = String(args.pageId ?? "");
      if (!pageId) return errResult("pageId is required");
      try {
        await ctx.runMutation(internal.mcp.internal.trashPage, { userId, pageId });
        return textResult({ ok: true, pageId });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }

    // ── Memory graph ───────────────────────────────────────────────
    case "graph_backlinks": {
      const pageId = String(args.pageId ?? "");
      if (!pageId) return errResult("pageId is required");
      const r = await ctx.runQuery(internal.mcp.internal.graphBacklinks, { userId, pageId });
      return textResult(r);
    }
    case "graph_links": {
      const pageId = String(args.pageId ?? "");
      if (!pageId) return errResult("pageId is required");
      const r = await ctx.runQuery(internal.mcp.internal.graphOutgoing, { userId, pageId });
      return textResult(r);
    }
    case "graph_neighbors": {
      const pageId = String(args.pageId ?? "");
      if (!pageId) return errResult("pageId is required");
      const rawDepth = args.depth;
      const depth = typeof rawDepth === "number" && rawDepth > 0 ? Math.floor(rawDepth) : undefined;
      const r = await ctx.runQuery(internal.mcp.internal.graphNeighbors, { userId, pageId, depth });
      return textResult(r);
    }
    case "graph_global": {
      const rawLimit = args.limit;
      const limit = typeof rawLimit === "number" && rawLimit > 0 ? Math.floor(rawLimit) : undefined;
      const includeTags = typeof args.includeTags === "boolean" ? args.includeTags : undefined;
      const r = await ctx.runQuery(internal.mcp.internal.graphGlobal, { userId, limit, includeTags });
      return textResult(r);
    }
    case "graph_tags": {
      const r = await ctx.runQuery(internal.mcp.internal.graphTags, { userId });
      return textResult(r);
    }
    case "graph_by_tag": {
      const tag = String(args.tag ?? "");
      if (!tag) return errResult("tag is required");
      const r = await ctx.runQuery(internal.mcp.internal.graphByTag, { userId, tag });
      return textResult(r);
    }
    case "graph_unlinked_mentions": {
      const pageId = String(args.pageId ?? "");
      if (!pageId) return errResult("pageId is required");
      const r = await ctx.runQuery(internal.mcp.internal.graphUnlinkedMentions, { userId, pageId });
      return textResult(r);
    }
    case "graph_related": {
      const pageId = String(args.pageId ?? "");
      if (!pageId) return errResult("pageId is required");
      const r = await ctx.runQuery(internal.mcp.internal.graphRelated, { userId, pageId });
      return textResult(r);
    }
    case "note_create_linked": {
      const title = String(args.title ?? "").trim();
      if (!title) return errResult("title is required");
      const markdown = typeof args.markdown === "string" ? args.markdown : undefined;
      const links = Array.isArray(args.links) ? args.links.map((l) => String(l ?? "")).filter(Boolean) : undefined;
      const tags = Array.isArray(args.tags) ? args.tags.map((t) => String(t ?? "")).filter(Boolean) : undefined;
      const icon = typeof args.icon === "string" && args.icon ? args.icon : undefined;
      try {
        const pageId = await ctx.runMutation(internal.mcp.internal.createLinkedNote, {
          userId, title, markdown, links, tags, icon,
        });
        return textResult({ ok: true, pageId });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "note_link": {
      const fromPageId = String(args.fromPageId ?? "");
      const to = String(args.to ?? "").trim();
      if (!fromPageId) return errResult("fromPageId is required");
      if (!to) return errResult("to is required");
      const alias = typeof args.alias === "string" && args.alias.trim() ? args.alias.trim() : undefined;
      try {
        const r = await ctx.runMutation(internal.mcp.internal.addLink, {
          userId, fromPageId, to, alias,
        });
        return textResult(r);
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
    case "note_tag": {
      const pageId = String(args.pageId ?? "");
      const tag = String(args.tag ?? "").trim();
      if (!pageId) return errResult("pageId is required");
      if (!tag) return errResult("tag is required");
      try {
        const r = await ctx.runMutation(internal.mcp.internal.addTag, { userId, pageId, tag });
        return textResult(r);
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }

    default:
      return errResult(`Unknown tool: ${name}`);
  }
}

// ────────────── Property schema helpers ──────────────

/** Map user-facing type alias → Nosion internal type. Notion uses
 *  `title`, Nosion stores it as `text` (the first text property doubles
 *  as title). Other types pass through. */
const TYPE_ALIASES: Record<string, string> = {
  title: "text",
  rich_text: "text",
};

const ALLOWED_PROP_TYPES = new Set([
  "text", "number", "select", "multi_select", "status", "date",
  "checkbox", "url", "email", "phone",
]);

function buildPropertiesArray(input: unknown): Array<{ id: string; name: string; type: string; options?: Array<{ id: string; value: string }> }> {
  if (!input || typeof input !== "object") return [];
  const out: Array<{ id: string; name: string; type: string; options?: Array<{ id: string; value: string }> }> = [];
  for (const [name, spec] of Object.entries(input as Record<string, unknown>)) {
    const s = spec as { type?: string; options?: unknown };
    const rawType = String(s?.type ?? "text").toLowerCase();
    const type = TYPE_ALIASES[rawType] ?? rawType;
    if (!ALLOWED_PROP_TYPES.has(type)) continue; // silently skip unknown types
    const prop: { id: string; name: string; type: string; options?: Array<{ id: string; value: string }> } = {
      id: crypto.randomUUID().slice(0, 12),
      name,
      type,
    };
    if (Array.isArray(s.options) && (type === "select" || type === "multi_select" || type === "status")) {
      prop.options = s.options.map((opt) => ({
        id: crypto.randomUUID().slice(0, 8),
        value: String(opt),
      }));
    }
    out.push(prop);
  }
  return out;
}

/** Convert caller-supplied { propName: value } map into the internal
 *  `rowProps` shape keyed by property id. Title goes to a separate
 *  return field since it's stored on the page row, not in rowProps. */
function mapPropsByName(
  schema: Array<{ id: string; name: string; type: string }>,
  inputByName: Record<string, unknown>,
): { rowProps: Record<string, unknown>; title?: string } {
  const nameToProp = new Map<string, { id: string; type: string }>();
  for (const p of schema) nameToProp.set(p.name, { id: p.id, type: p.type });
  // First text property is the title field by convention.
  const titleProp = schema.find((p) => p.type === "text");
  const rowProps: Record<string, unknown> = {};
  let title: string | undefined;
  for (const [name, value] of Object.entries(inputByName)) {
    const prop = nameToProp.get(name);
    if (!prop) continue; // silently drop unknown property
    if (prop.id === titleProp?.id) {
      title = String(value ?? "");
    } else {
      rowProps[prop.id] = value;
    }
  }
  return { rowProps, title };
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
        "www-authenticate": `Bearer realm="silong-mcp", resource_metadata="${process.env.SITE_URL ?? "https://silong.rahmanef.com"}/.well-known/oauth-protected-resource"`,
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
