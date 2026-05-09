/** MCP HTTP surface — Notion-shape JSON over HTTPS, dispatched by
 *  tool name in the request body. Single endpoint pattern keeps the
 *  router config minimal; the tool dispatcher handles every Nosion
 *  MCP verb.
 *
 *  Auth: Bearer token in `Authorization` header, compared against
 *  `MCP_API_TOKEN` env var. The token resolves to a single user id
 *  via `MCP_USER_ID` env var (single-tenant cut). Per-user tokens
 *  table is a follow-up.
 *
 *  Wire it up by mounting the route in `convex/http.ts`:
 *    http.route({ path: "/mcp/v1", method: "POST", handler: mcpHandler });
 *
 *  Every response is `{ ok, data?, error? }`. Errors return 4xx/5xx
 *  with a sanitized human-readable message — never internals. */

import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  blockToNotion, blockFromNotion,
  propertyToNotionSchema, propertiesArrayToMap,
  valueToNotion, valueFromNotion,
} from "../_shared/notionShape";

const ok = (data: unknown, extra?: Record<string, unknown>): Response =>
  new Response(JSON.stringify({ ok: true, data, ...(extra ?? {}) }), {
    status: 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

const err = (status: number, message: string): Response =>
  new Response(JSON.stringify({ ok: false, error: { message } }), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

/** Validate Bearer token, resolve to userId. Single-tenant cut. */
function authenticate(req: Request): { userId: Id<"users"> } | { error: Response } {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.MCP_API_TOKEN;
  const userIdEnv = process.env.MCP_USER_ID;
  if (!expected || !userIdEnv) {
    return { error: err(503, "MCP not configured — set MCP_API_TOKEN + MCP_USER_ID on the deployment.") };
  }
  if (!auth.startsWith("Bearer ")) return { error: err(401, "Missing Bearer token") };
  const token = auth.slice("Bearer ".length).trim();
  if (token !== expected) return { error: err(401, "Invalid token") };
  return { userId: userIdEnv as Id<"users"> };
}

/** Project a Convex pages doc to Notion-canonical page shape. */
function pageToNotionPage(doc: any) {
  return {
    object: "page",
    id: doc._id,
    created_time: new Date(doc.createdAt ?? doc._creationTime).toISOString(),
    last_edited_time: new Date(doc.updatedAt ?? doc._creationTime).toISOString(),
    parent: doc.rowOfDatabaseId
      ? { type: "database_id", database_id: doc.rowOfDatabaseId }
      : doc.parentId
        ? { type: "page_id", page_id: doc.parentId }
        : { type: "workspace", workspace: true },
    archived: !!doc.trashed,
    in_trash: !!doc.trashed,
    icon: doc.icon ? { type: "emoji", emoji: doc.icon } : null,
    cover: doc.cover ? { type: "external", external: { url: doc.cover } } : null,
    properties: {
      title: {
        id: "title",
        type: "title",
        title: doc.title
          ? [{ type: "text", text: { content: doc.title }, annotations: { bold:false,italic:false,strikethrough:false,underline:false,code:false,color:"default" }, plain_text: doc.title, href: null }]
          : [],
      },
    },
    url: `/share/${doc.shareSlug ?? doc._id}`,
    public_url: doc.isPublic ? `/share/${doc.shareSlug ?? doc._id}` : null,
  };
}

function databaseToNotionDatabase(doc: any) {
  return {
    object: "database",
    id: doc._id,
    created_time: new Date(doc.createdAt ?? doc._creationTime).toISOString(),
    last_edited_time: new Date(doc.updatedAt ?? doc._creationTime).toISOString(),
    title: doc.name
      ? [{ type: "text", text: { content: doc.name }, annotations: { bold:false,italic:false,strikethrough:false,underline:false,code:false,color:"default" }, plain_text: doc.name, href: null }]
      : [],
    icon: doc.icon ? { type: "emoji", emoji: doc.icon } : null,
    properties: propertiesArrayToMap((doc.properties ?? []) as any[]),
    archived: !!doc.trashed,
    in_trash: !!doc.trashed,
  };
}

function rowToNotionPage(row: any, db: any) {
  const props: Record<string, unknown> = {};
  for (const p of (db.properties ?? []) as any[]) {
    const raw = (row.rowProps ?? {})[p.id];
    if (raw === undefined || raw === null) continue;
    props[p.name] = valueToNotion(raw, p);
  }
  return {
    object: "page",
    id: row._id,
    created_time: new Date(row.createdAt ?? row._creationTime).toISOString(),
    last_edited_time: new Date(row.updatedAt ?? row._creationTime).toISOString(),
    parent: { type: "database_id", database_id: db._id },
    archived: !!row.trashed,
    icon: row.icon ? { type: "emoji", emoji: row.icon } : null,
    properties: {
      Name: {
        id: "title",
        type: "title",
        title: row.title
          ? [{ type: "text", text: { content: row.title }, annotations: { bold:false,italic:false,strikethrough:false,underline:false,code:false,color:"default" }, plain_text: row.title, href: null }]
          : [],
      },
      ...props,
    },
  };
}

interface ToolBody { tool: string; params?: Record<string, unknown> }

export const mcpHandler = httpAction(async (ctx, req) => {
  if (req.method !== "POST") return err(405, "POST only");
  const auth = authenticate(req);
  if ("error" in auth) return auth.error;

  let body: ToolBody;
  try { body = (await req.json()) as ToolBody; } catch { return err(400, "Invalid JSON body"); }
  if (!body.tool) return err(400, "Missing `tool`");
  const params = body.params ?? {};
  const { userId } = auth;

  try {
    switch (body.tool) {
      // ─── Read ────────────────────────────────────────────────
      case "nosion-search": {
        const items = await ctx.runQuery(internal.mcp.internal.searchPages, {
          userId,
          query: String(params.query ?? ""),
          limit: typeof params.limit === "number" ? params.limit : undefined,
        });
        return ok({
          object: "list",
          results: items.map(pageToNotionPage),
          has_more: false,
          next_cursor: null,
        });
      }

      case "nosion-list-pages": {
        const res = await ctx.runQuery(internal.mcp.internal.listPages, {
          userId,
          cursor: typeof params.cursor === "number" ? params.cursor : undefined,
          pageSize: typeof params.page_size === "number" ? params.page_size : undefined,
          parentId: params.parent_id as string | null | undefined,
          includeTrashed: !!params.include_trashed,
        });
        return ok({
          object: "list",
          results: res.items.map(pageToNotionPage),
          has_more: res.nextCursor !== null,
          next_cursor: res.nextCursor,
          total: res.total,
        });
      }

      case "nosion-list-databases": {
        const items = await ctx.runQuery(internal.mcp.internal.listDatabases, { userId });
        return ok({
          object: "list",
          results: items.map(databaseToNotionDatabase),
          has_more: false,
          next_cursor: null,
        });
      }

      case "nosion-fetch": {
        const id = String(params.id ?? "");
        if (!id) return err(400, "Missing `id`");
        // Try database first then page (cheapest probe order). MCP
        // semantics: caller doesn't have to know which kind it is.
        const db = await ctx.runQuery(internal.mcp.internal.fetchDatabase, { userId, dbId: id });
        if (db) return ok(databaseToNotionDatabase(db));
        const page = await ctx.runQuery(internal.mcp.internal.fetchPage, { userId, pageId: id });
        if (!page) return err(404, "Not found");
        const blocks = (page.blocks ?? []).map(blockToNotion);
        return ok({ ...pageToNotionPage(page), blocks });
      }

      case "nosion-list-rows": {
        const dbId = String(params.database_id ?? "");
        if (!dbId) return err(400, "Missing `database_id`");
        const db = await ctx.runQuery(internal.mcp.internal.fetchDatabase, { userId, dbId });
        if (!db) return err(404, "Not found");
        const res = await ctx.runQuery(internal.mcp.internal.listRows, {
          userId, dbId,
          cursor: typeof params.cursor === "number" ? params.cursor : undefined,
          pageSize: typeof params.page_size === "number" ? params.page_size : undefined,
        });
        return ok({
          object: "list",
          results: res.items.map((r: any) => rowToNotionPage(r, db)),
          has_more: res.nextCursor !== null,
          next_cursor: res.nextCursor,
          total: res.total,
        });
      }

      // ─── Write ───────────────────────────────────────────────
      case "nosion-create-page": {
        // Accepts Notion-shape blocks[] in `children`.
        const incoming = Array.isArray(params.children) ? (params.children as any[]) : [];
        const blocks = incoming.map(blockFromNotion);
        const id = await ctx.runMutation(internal.mcp.internal.createPage, {
          userId,
          parentId: (params.parent_id as string) ?? null,
          title: params.title as string | undefined,
          icon: params.icon as string | undefined,
          blocks,
        });
        const page = await ctx.runQuery(internal.mcp.internal.fetchPage, { userId, pageId: id });
        return ok(pageToNotionPage(page));
      }

      case "nosion-update-page": {
        const pageId = String(params.page_id ?? "");
        if (!pageId) return err(400, "Missing `page_id`");
        const patch: Record<string, unknown> = {};
        if (typeof params.title === "string") patch.title = params.title;
        if (typeof params.icon === "string") patch.icon = params.icon;
        if (params.cover !== undefined) {
          const c = params.cover as any;
          patch.cover = c?.external?.url ?? c?.url ?? c ?? null;
        }
        if (Array.isArray(params.children)) {
          patch.blocks = (params.children as any[]).map(blockFromNotion);
        }
        await ctx.runMutation(internal.mcp.internal.updatePage, { userId, pageId, patch });
        const page = await ctx.runQuery(internal.mcp.internal.fetchPage, { userId, pageId });
        return ok(pageToNotionPage(page));
      }

      case "nosion-move-page": {
        const pageId = String(params.page_id ?? "");
        if (!pageId) return err(400, "Missing `page_id`");
        const parentId = (params.parent_id as string) ?? null;
        await ctx.runMutation(internal.mcp.internal.movePage, { userId, pageId, parentId });
        return ok({ id: pageId, parent_id: parentId });
      }

      case "nosion-trash-page": {
        const pageId = String(params.page_id ?? "");
        if (!pageId) return err(400, "Missing `page_id`");
        await ctx.runMutation(internal.mcp.internal.trashPage, { userId, pageId });
        return ok({ id: pageId, archived: true });
      }

      case "nosion-duplicate-page": {
        const pageId = String(params.page_id ?? "");
        if (!pageId) return err(400, "Missing `page_id`");
        const newId = await ctx.runMutation(internal.mcp.internal.duplicatePage, { userId, pageId });
        const page = await ctx.runQuery(internal.mcp.internal.fetchPage, { userId, pageId: newId });
        return ok(pageToNotionPage(page));
      }

      case "nosion-create-database": {
        const id = await ctx.runMutation(internal.mcp.internal.createDatabase, {
          userId,
          name: params.title as string | undefined,
          // properties optional — caller can patch via update later
        });
        const db = await ctx.runQuery(internal.mcp.internal.fetchDatabase, { userId, dbId: id });
        return ok(databaseToNotionDatabase(db));
      }

      case "nosion-update-database": {
        const dbId = String(params.database_id ?? "");
        if (!dbId) return err(400, "Missing `database_id`");
        const patch: Record<string, unknown> = {};
        if (typeof params.title === "string") patch.name = params.title;
        if (typeof params.icon === "string") patch.icon = params.icon;
        // Properties patch comes as a Notion-shape map — we just
        // accept the array form for now (callers wanting full schema
        // edit should send array via `properties`).
        if (Array.isArray(params.properties)) patch.properties = params.properties;
        await ctx.runMutation(internal.mcp.internal.updateDatabase, { userId, dbId, patch });
        const db = await ctx.runQuery(internal.mcp.internal.fetchDatabase, { userId, dbId });
        return ok(databaseToNotionDatabase(db));
      }

      case "nosion-create-row": {
        const dbId = String(params.database_id ?? "");
        if (!dbId) return err(400, "Missing `database_id`");
        const db = await ctx.runQuery(internal.mcp.internal.fetchDatabase, { userId, dbId });
        if (!db) return err(404, "Database not found");
        const rowProps = mapNotionPropsToRaw(params.properties as Record<string, any> | undefined, db);
        const titleProp = (params.properties as any)?.Name?.title;
        const title = Array.isArray(titleProp) && titleProp[0]?.plain_text
          ? titleProp[0].plain_text as string
          : undefined;
        const rowId = await ctx.runMutation(internal.mcp.internal.createRow, { userId, dbId, rowProps, title });
        const row = await ctx.runQuery(internal.mcp.internal.fetchPage, { userId, pageId: rowId });
        return ok(rowToNotionPage(row, db));
      }

      case "nosion-update-row": {
        const rowPageId = String(params.page_id ?? "");
        if (!rowPageId) return err(400, "Missing `page_id`");
        const row = await ctx.runQuery(internal.mcp.internal.fetchPage, { userId, pageId: rowPageId });
        if (!row || !row.rowOfDatabaseId) return err(404, "Row not found");
        const db = await ctx.runQuery(internal.mcp.internal.fetchDatabase, { userId, dbId: row.rowOfDatabaseId });
        if (!db) return err(404, "Database not found");
        const rowProps = mapNotionPropsToRaw(params.properties as Record<string, any> | undefined, db);
        await ctx.runMutation(internal.mcp.internal.updateRow, { userId, rowPageId, rowProps });
        const updated = await ctx.runQuery(internal.mcp.internal.fetchPage, { userId, pageId: rowPageId });
        return ok(rowToNotionPage(updated, db));
      }

      // ─── Discovery ───────────────────────────────────────────
      case "nosion-list-tools": {
        return ok({
          tools: TOOL_LIST,
        });
      }

      default:
        return err(400, `Unknown tool: ${body.tool}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    // Convex auth errors look like "Tidak ditemukan" / "Belum login"
    if (/Tidak ditemukan|not found/i.test(msg)) return err(404, msg);
    return err(500, msg.length > 200 ? msg.slice(0, 200) : msg);
  }
});

/** Notion `properties` is a name-keyed map of typed envelopes; convert
 *  to Nosion's flat `propId → raw value` map. Properties not on the
 *  target db schema are silently dropped. */
function mapNotionPropsToRaw(
  notionProps: Record<string, any> | undefined,
  db: any,
): Record<string, unknown> {
  if (!notionProps) return {};
  const out: Record<string, unknown> = {};
  const byName = new Map<string, any>((db.properties ?? []).map((p: any) => [p.name, p]));
  for (const [name, env] of Object.entries(notionProps)) {
    const prop = byName.get(name);
    if (!prop) continue;
    out[prop.id] = valueFromNotion(env, prop);
  }
  return out;
}

const TOOL_LIST = [
  { name: "nosion-search", description: "Full-text search across pages.", required: ["query"] },
  { name: "nosion-list-pages", description: "List pages with cursor pagination.", required: [] },
  { name: "nosion-list-databases", description: "List all databases.", required: [] },
  { name: "nosion-fetch", description: "Fetch any page or database by id.", required: ["id"] },
  { name: "nosion-list-rows", description: "List rows of a database.", required: ["database_id"] },
  { name: "nosion-create-page", description: "Create a page with optional Notion-shape children blocks.", required: [] },
  { name: "nosion-update-page", description: "Patch page title/icon/cover/children.", required: ["page_id"] },
  { name: "nosion-move-page", description: "Reparent a page.", required: ["page_id"] },
  { name: "nosion-trash-page", description: "Soft-delete a page (archive).", required: ["page_id"] },
  { name: "nosion-duplicate-page", description: "Deep-clone a page with fresh ids.", required: ["page_id"] },
  { name: "nosion-create-database", description: "Create a database.", required: [] },
  { name: "nosion-update-database", description: "Patch database title/icon/properties.", required: ["database_id"] },
  { name: "nosion-create-row", description: "Insert a row with Notion-shape properties envelope.", required: ["database_id"] },
  { name: "nosion-update-row", description: "Patch row properties.", required: ["page_id"] },
  { name: "nosion-list-tools", description: "List available MCP tools.", required: [] },
] as const;
