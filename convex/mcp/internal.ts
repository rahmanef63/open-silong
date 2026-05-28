/** MCP-internal queries + mutations — invoked by `convex/mcp/http.ts`
 *  after the HTTP layer has already authenticated the request via
 *  Bearer token. Each fn takes `userId` as an explicit arg and gates
 *  ownership inline (no `getAuthUserId` — the Convex auth context is
 *  empty for MCP requests).
 *
 *  Why a parallel surface instead of reusing `pages.ts` / `databases.ts`?
 *    1. Auth model differs — those use `requireAuth` which throws when
 *       there's no Convex session; MCP auth is token-based.
 *    2. MCP is a stable PUBLIC contract — should not break when the
 *       internal Convex API shape changes.
 *    3. We can reshape responses to Notion-canonical here without
 *       touching the live UI fns.
 */

import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { buildSearchText } from "../features/search/lib";
import { regenAllBlockIds, type BlockLike } from "../_shared/blocks";
import { CHAR_CAPS, COUNT_CAPS } from "../_shared/limits";
import { uid } from "../_shared/uid";
// Static import — dynamic `await import("../_shared/markdown")` throws
// "dynamic module import unsupported" inside Convex internal mutations.
import { markdownToBlocks } from "../_shared/markdown";
import { getActiveWorkspaceMutation } from "../_shared/workspace";

// ─── Read ──────────────────────────────────────────────────────────

/** List pages for a given user with cursor pagination. Cursor is the
 *  index into the by_user collection (simple — Convex doesn't have a
 *  generic opaque cursor for `.collect()` results, but this scales to
 *  ~10k pages comfortably). */
export const listPages = internalQuery({
  args: {
    userId: v.id("users"),
    cursor: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    parentId: v.optional(v.union(v.string(), v.null())),
    includeTrashed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("pages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(COUNT_CAPS.pagesPerWorkspaceScan);
    const filtered = all.filter((p) => {
      if (!args.includeTrashed && p.trashed) return false;
      if (args.parentId !== undefined && p.parentId !== args.parentId) return false;
      return true;
    });
    const cursor = args.cursor ?? 0;
    const size = Math.min(args.pageSize ?? 50, 100);
    const slice = filtered.slice(cursor, cursor + size);
    const nextCursor = cursor + size < filtered.length ? cursor + size : null;
    return { items: slice, nextCursor, total: filtered.length };
  },
});

export const listDatabases = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.query("databases").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(COUNT_CAPS.databasesPerWorkspaceScan);
  },
});

export const fetchPage = internalQuery({
  args: { userId: v.id("users"), pageId: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.pageId as Id<"pages">);
    if (!doc || doc.userId !== args.userId) return null;
    return doc;
  },
});

export const fetchDatabase = internalQuery({
  args: { userId: v.id("users"), dbId: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.dbId as Id<"databases">);
    if (!doc || doc.userId !== args.userId) return null;
    return doc;
  },
});

export const listRows = internalQuery({
  args: {
    userId: v.id("users"),
    dbId: v.string(),
    cursor: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const db = await ctx.db.get(args.dbId as Id<"databases">);
    if (!db || db.userId !== args.userId) return { items: [], nextCursor: null, total: 0 };
    const cursor = args.cursor ?? 0;
    const size = Math.min(args.pageSize ?? 50, 100);
    const sliceIds = db.rowIds.slice(cursor, cursor + size);
    const rows = await Promise.all(sliceIds.map((id) => ctx.db.get(id as Id<"pages">)));
    const items = rows.filter((r): r is NonNullable<typeof r> => !!r && r.userId === args.userId && !r.trashed);
    const nextCursor = cursor + size < db.rowIds.length ? cursor + size : null;
    return { items, nextCursor, total: db.rowIds.length };
  },
});

/** Full-text search across pages owned by `userId`. Uses the
 *  `search_content` searchIndex on `pages.searchText`. */
export const searchPages = internalQuery({
  args: { userId: v.id("users"), query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const q = args.query.slice(0, CHAR_CAPS.searchQuery);
    const results = await ctx.db
      .query("pages")
      .withSearchIndex("search_content", (s) => s.search("searchText", q).eq("userId", args.userId).eq("trashed", false))
      .take(Math.min(args.limit ?? 20, COUNT_CAPS.searchResultMax));
    return results;
  },
});

// ─── Write ─────────────────────────────────────────────────────────

export const createPage = internalMutation({
  args: {
    userId: v.id("users"),
    parentId: v.union(v.string(), v.null()),
    title: v.optional(v.string()),
    icon: v.optional(v.string()),
    blocks: v.optional(v.array(v.any())),
    rowOfDatabaseId: v.optional(v.string()),
    rowProps: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Stamp the user's active workspace so the page is visible in
    // sidebar + library (both filter by `by_workspace` index). Without
    // this MCP-created pages exist on disk but vanish from the UI.
    const ws = await getActiveWorkspaceMutation(ctx, args.userId);
    const seedBlocks: BlockLike[] = args.blocks?.length
      ? regenAllBlockIds(args.blocks as BlockLike[])
      : [{ id: uid(), type: "paragraph", text: "" }];
    return await ctx.db.insert("pages", {
      userId: args.userId,
      workspaceId: ws._id,
      parentId: args.parentId as Id<"pages"> | null,
      title: args.title ?? "",
      icon: args.icon ?? "📄",
      cover: null,
      blocks: seedBlocks,
      favorite: false,
      trashed: false,
      isPublic: false,
      rowOfDatabaseId: args.rowOfDatabaseId as Id<"databases"> | undefined,
      rowProps: args.rowOfDatabaseId ? (args.rowProps ?? {}) : undefined,
      searchText: buildSearchText(args.title, seedBlocks),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePage = internalMutation({
  args: {
    userId: v.id("users"),
    pageId: v.string(),
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.pageId as Id<"pages">);
    if (!doc || doc.userId !== args.userId) throw new Error("Tidak ditemukan");
    const allowed = ["title", "icon", "cover", "blocks", "favorite", "parentId", "font", "smallText", "fullWidth", "locked", "rowProps"];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in (args.patch ?? {})) patch[k] = args.patch[k];
    }
    if (typeof patch.title === "string" && (patch.title as string).length > CHAR_CAPS.pageTitle) {
      throw new Error("Title too long");
    }
    if (Array.isArray(patch.blocks) && (patch.blocks as unknown[]).length > COUNT_CAPS.blocksPerPage) {
      throw new Error(`Page exceeds block cap (${COUNT_CAPS.blocksPerPage})`);
    }
    const nextTitle = (patch.title as string) ?? doc.title;
    const nextBlocks = (patch.blocks as unknown[]) ?? doc.blocks;
    const touchesContent = "title" in patch || "blocks" in patch;
    await ctx.db.patch(args.pageId as Id<"pages">, {
      ...patch,
      ...(touchesContent ? { searchText: buildSearchText(nextTitle, nextBlocks) } : {}),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const movePage = internalMutation({
  args: { userId: v.id("users"), pageId: v.string(), parentId: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.pageId as Id<"pages">);
    if (!doc || doc.userId !== args.userId) throw new Error("Tidak ditemukan");
    await ctx.db.patch(args.pageId as Id<"pages">, { parentId: args.parentId as Id<"pages"> | null, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const trashPage = internalMutation({
  args: { userId: v.id("users"), pageId: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.pageId as Id<"pages">);
    if (!doc || doc.userId !== args.userId) throw new Error("Tidak ditemukan");
    await ctx.db.patch(args.pageId as Id<"pages">, { trashed: true, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const duplicatePage = internalMutation({
  args: { userId: v.id("users"), pageId: v.string() },
  handler: async (ctx, args) => {
    const src = await ctx.db.get(args.pageId as Id<"pages">);
    if (!src || src.userId !== args.userId) throw new Error("Tidak ditemukan");
    const now = Date.now();
    const cloned = JSON.parse(JSON.stringify(src.blocks)) as BlockLike[];
    const blocks = regenAllBlockIds(cloned);
    const title = src.title ? `${src.title} (copy)` : "";
    return await ctx.db.insert("pages", {
      userId: args.userId,
      // Inherit src workspace if stamped; otherwise resolve active.
      workspaceId: src.workspaceId ?? (await getActiveWorkspaceMutation(ctx, args.userId))._id,
      parentId: src.parentId,
      title,
      icon: src.icon,
      cover: src.cover,
      blocks,
      favorite: false,
      trashed: false,
      isPublic: false,
      rowOfDatabaseId: src.rowOfDatabaseId,
      rowProps: src.rowProps ? JSON.parse(JSON.stringify(src.rowProps)) : undefined,
      searchText: buildSearchText(title, blocks),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createDatabase = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    properties: v.optional(v.array(v.any())),
    views: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ws = await getActiveWorkspaceMutation(ctx, args.userId);
    const titleProp = { id: uid(), name: "Name", type: "text" };
    const properties = args.properties?.length ? args.properties : [titleProp];
    const defaultView = { id: uid(), name: "Table", type: "table", sorts: [], filters: [], search: "" };
    const views = args.views?.length ? args.views : [defaultView];
    return await ctx.db.insert("databases", {
      userId: args.userId,
      workspaceId: ws._id,
      name: args.name ?? "Untitled database",
      icon: args.icon ?? "🗂️",
      properties,
      rowIds: [],
      views,
      activeViewId: views[0].id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateDatabase = internalMutation({
  args: { userId: v.id("users"), dbId: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.dbId as Id<"databases">);
    if (!doc || doc.userId !== args.userId) throw new Error("Tidak ditemukan");
    await ctx.db.patch(args.dbId as Id<"databases">, { ...args.patch, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const createRow = internalMutation({
  args: {
    userId: v.id("users"),
    dbId: v.string(),
    rowProps: v.optional(v.any()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const db = await ctx.db.get(args.dbId as Id<"databases">);
    if (!db || db.userId !== args.userId) throw new Error("Tidak ditemukan");
    const now = Date.now();
    const ws = await getActiveWorkspaceMutation(ctx, args.userId);
    const blocks = [{ id: uid(), type: "paragraph", text: "" }];
    const rowId = await ctx.db.insert("pages", {
      userId: args.userId,
      workspaceId: ws._id,
      parentId: null,
      title: args.title ?? "",
      icon: "📄",
      cover: null,
      blocks,
      favorite: false,
      trashed: false,
      rowOfDatabaseId: args.dbId as Id<"databases">,
      rowProps: args.rowProps ?? {},
      searchText: buildSearchText(args.title, blocks),
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(args.dbId as Id<"databases">, {
      rowIds: [...db.rowIds, rowId],
      updatedAt: now,
    });
    return rowId;
  },
});

export const updateRow = internalMutation({
  args: { userId: v.id("users"), rowPageId: v.string(), rowProps: v.any() },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.rowPageId as Id<"pages">);
    if (!doc || doc.userId !== args.userId) throw new Error("Tidak ditemukan");
    const merged = { ...(doc.rowProps ?? {}), ...(args.rowProps ?? {}) };
    await ctx.db.patch(args.rowPageId as Id<"pages">, { rowProps: merged, updatedAt: Date.now() });
    return { ok: true };
  },
});

/** Append markdown to the end of a page. Server-side parses via
 *  `_shared/markdown.markdownToBlocks` so the MCP client emits ONE
 *  call instead of N add-block round-trips. Drops the trailing empty
 *  paragraph that newly-created pages ship with so appended content
 *  doesn't render with an empty gap above. */
export const appendMarkdownAs = internalMutation({
  args: { userId: v.id("users"), pageId: v.string(), markdown: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== args.userId) throw new Error("Tidak ditemukan");
    const parsed = markdownToBlocks(args.markdown);
    const cur = page.blocks as Array<{ id: string; type?: string; text?: string }>;
    const trimmed = cur.length === 1 && cur[0].type === "paragraph" && cur[0].text === ""
      ? []
      : cur;
    const blocks = [...trimmed, ...parsed];
    if (blocks.length > COUNT_CAPS.blocksPerPage) {
      throw new Error(`Page would exceed block cap (${COUNT_CAPS.blocksPerPage})`);
    }
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      searchText: buildSearchText(page.title, blocks),
      updatedAt: Date.now(),
    });
    return parsed.length;
  },
});

/** Set page title only. Idempotent — same title → same final state. */
export const setTitleAs = internalMutation({
  args: { userId: v.id("users"), pageId: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== args.userId) throw new Error("Tidak ditemukan");
    if (args.title.length > CHAR_CAPS.pageTitle) throw new Error("Title too long");
    await ctx.db.patch(args.pageId as Id<"pages">, {
      title: args.title,
      searchText: buildSearchText(args.title, page.blocks),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Append an INLINE DATABASE block to a page (embed an existing
 *  database inside the page's block stream — the Notion "inline DB"
 *  pattern). Block shape: { id, type:"database", text:"", databaseId }. */
export const embedDatabaseAs = internalMutation({
  args: { userId: v.id("users"), pageId: v.string(), dbId: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== args.userId) throw new Error("Page tidak ditemukan");
    const db = await ctx.db.get(args.dbId as Id<"databases">);
    if (!db || db.userId !== args.userId) throw new Error("Database tidak ditemukan");
    const cur = page.blocks as Array<{ id: string; type?: string; text?: string }>;
    // Drop the stub empty paragraph that new pages ship with so the
    // embed renders flush with the page top.
    const trimmed = cur.length === 1 && cur[0].type === "paragraph" && cur[0].text === ""
      ? []
      : cur;
    const block = { id: uid(), type: "database", text: "", databaseId: args.dbId };
    const blocks = [...trimmed, block];
    if (blocks.length > COUNT_CAPS.blocksPerPage) {
      throw new Error(`Page would exceed block cap (${COUNT_CAPS.blocksPerPage})`);
    }
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      searchText: buildSearchText(page.title, blocks),
      updatedAt: Date.now(),
    });
    return { ok: true, blockId: block.id };
  },
});

/** Append a COLUMNS section (side-by-side blocks). Each item in
 *  `columns` is markdown for one column. Stamps a new layout entry +
 *  blocks with `layoutGroup` + `layoutCol`. */
export const appendColumnsAs = internalMutation({
  args: {
    userId: v.id("users"),
    pageId: v.string(),
    columns: v.array(v.string()),
    widths: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    if (args.columns.length < 2 || args.columns.length > 4) {
      throw new Error("columns must be 2..4 entries");
    }
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== args.userId) throw new Error("Page tidak ditemukan");
    const layoutId = uid();
    const newLayout = {
      id: layoutId,
      type: "columns" as const,
      count: args.columns.length,
      ...(args.widths && args.widths.length === args.columns.length ? { widths: args.widths } : {}),
    };
    const newBlocks: Array<Record<string, unknown>> = [];
    for (let col = 0; col < args.columns.length; col++) {
      const md = args.columns[col];
      const parsed = markdownToBlocks(md.trim() || " ");
      for (const b of parsed) {
        newBlocks.push({ ...b, layoutGroup: layoutId, layoutCol: col });
      }
    }
    const cur = page.blocks as Array<{ id: string; type?: string; text?: string }>;
    const trimmed = cur.length === 1 && cur[0].type === "paragraph" && cur[0].text === ""
      ? []
      : cur;
    const blocks = [...trimmed, ...newBlocks];
    if (blocks.length > COUNT_CAPS.blocksPerPage) {
      throw new Error(`Page would exceed block cap (${COUNT_CAPS.blocksPerPage})`);
    }
    const layouts = [...(page.layouts ?? []), newLayout];
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      layouts,
      searchText: buildSearchText(page.title, blocks),
      updatedAt: Date.now(),
    });
    return { ok: true, layoutId, blocksInserted: newBlocks.length };
  },
});

/** Set page icon (emoji). Idempotent. */
export const setIconAs = internalMutation({
  args: { userId: v.id("users"), pageId: v.string(), icon: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== args.userId) throw new Error("Tidak ditemukan");
    const icon = args.icon.trim().slice(0, 8) || "📄";
    await ctx.db.patch(args.pageId as Id<"pages">, { icon, updatedAt: Date.now() });
    return { ok: true };
  },
});
