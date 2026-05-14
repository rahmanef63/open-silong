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
      .collect();
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
    return await ctx.db.query("databases").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
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
    const seedBlocks: BlockLike[] = args.blocks?.length
      ? regenAllBlockIds(args.blocks as BlockLike[])
      : [{ id: uid(), type: "paragraph", text: "" }];
    return await ctx.db.insert("pages", {
      userId: args.userId,
      parentId: args.parentId,
      title: args.title ?? "",
      icon: args.icon ?? "📄",
      cover: null,
      blocks: seedBlocks,
      favorite: false,
      trashed: false,
      isPublic: false,
      rowOfDatabaseId: args.rowOfDatabaseId,
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
    await ctx.db.patch(args.pageId as Id<"pages">, { parentId: args.parentId, updatedAt: Date.now() });
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
    properties: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const titleProp = { id: uid(), name: "Name", type: "text" };
    const properties = args.properties?.length ? args.properties : [titleProp];
    const view = { id: uid(), name: "Table", type: "table", sorts: [], filters: [], search: "" };
    return await ctx.db.insert("databases", {
      userId: args.userId,
      name: args.name ?? "Untitled database",
      icon: "🗂️",
      properties,
      rowIds: [],
      views: [view],
      activeViewId: view.id,
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
    const blocks = [{ id: uid(), type: "paragraph", text: "" }];
    const rowId = await ctx.db.insert("pages", {
      userId: args.userId,
      parentId: null,
      title: args.title ?? "",
      icon: "📄",
      cover: null,
      blocks,
      favorite: false,
      trashed: false,
      rowOfDatabaseId: args.dbId,
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
