import { internalMutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { buildSearchText } from "../features/search/lib";
import type { Id } from "../_generated/dataModel";
import { uid } from "../_shared/uid";

async function insertDb(
  ctx: MutationCtx,
  userId: Id<"users">,
  name: string,
  headers: string[],
  rows: string[][],
): Promise<Id<"databases">> {
  const now = Date.now();
  const props = headers.map((h, i) => ({
    id: uid(),
    name: h || `Column ${i + 1}`,
    type: i === 0 ? "title" : "text",
  }));
  const view = {
    id: uid(),
    name: "Table",
    type: "table",
    sorts: [],
    filters: [],
    search: "",
  };
  const dbId = await ctx.db.insert("databases", {
    userId,
    name,
    icon: "🗂️",
    properties: props,
    rowIds: [],
    views: [view],
    activeViewId: view.id,
    createdAt: now,
    updatedAt: now,
  });

  const rowIds: string[] = [];
  for (const cells of rows) {
    const rowProps: Record<string, string> = {};
    props.forEach((p, i) => { rowProps[p.id] = cells[i] ?? ""; });
    const title = (cells[0] ?? "").trim() || "Untitled";
    const rowPageId = await ctx.db.insert("pages", {
      userId,
      parentId: null,
      title,
      icon: "📄",
      cover: null,
      blocks: [{ id: uid(), type: "paragraph", text: "" }],
      favorite: false,
      trashed: false,
      isPublic: false,
      rowOfDatabaseId: String(dbId),
      rowProps,
      searchText: buildSearchText(title, []),
      createdAt: now,
      updatedAt: now,
    });
    rowIds.push(String(rowPageId));
  }
  await ctx.db.patch(dbId, { rowIds });
  return dbId;
}

/** Insert a fully-formed page on behalf of the importer. Caller is the
 *  authenticated user — we trust the action that gated auth. */
export const createPage = internalMutation({
  args: {
    userId: v.id("users"),
    parentId: v.union(v.string(), v.null()),
    title: v.string(),
    icon: v.optional(v.string()),
    blocks: v.array(v.any()),
  },
  handler: async (ctx, { userId, parentId, title, icon, blocks }) => {
    const now = Date.now();
    return await ctx.db.insert("pages", {
      userId,
      parentId,
      title,
      icon: icon ?? "📄",
      cover: null,
      blocks,
      favorite: false,
      trashed: false,
      isPublic: false,
      searchText: buildSearchText(title, blocks),
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Append blocks to an existing page (used to drop a database block reference
 *  into the just-created index page). */
export const appendBlocks = internalMutation({
  args: {
    userId: v.id("users"),
    pageId: v.string(),
    blocks: v.array(v.any()),
  },
  handler: async (ctx, { userId, pageId, blocks }) => {
    const page = await ctx.db.get(pageId as Id<"pages">);
    if (!page || page.userId !== userId) return;
    const next = [...page.blocks, ...blocks];
    await ctx.db.patch(pageId as Id<"pages">, {
      blocks: next,
      searchText: buildSearchText(page.title, next),
      updatedAt: Date.now(),
    });
  },
});

/** Create a database from CSV data + a host page that contains a `database`
 *  block referencing it. Without the host page the new database is invisible
 *  in the sidebar tree and only reachable by direct URL. */
export const createDatabaseFromCsvWithHost = internalMutation({
  args: {
    userId: v.id("users"),
    parentId: v.union(v.string(), v.null()),
    name: v.string(),
    headers: v.array(v.string()),
    rows: v.array(v.array(v.string())),
  },
  handler: async (ctx, { userId, parentId, name, headers, rows }) => {
    const dbId = await insertDb(ctx, userId, name, headers, rows);
    const now = Date.now();
    const blocks = [
      { id: uid(), type: "database", text: "", databaseId: dbId },
    ];
    const pageId = await ctx.db.insert("pages", {
      userId,
      parentId,
      title: name,
      icon: "🗂️",
      cover: null,
      blocks,
      favorite: false,
      trashed: false,
      isPublic: false,
      searchText: buildSearchText(name, blocks),
      createdAt: now,
      updatedAt: now,
    });
    return { dbId, pageId: String(pageId) };
  },
});

/** Create a database from CSV data: header row → text properties, body rows
 *  → child pages with rowProps. Standalone (no host page). Kept for backward
 *  compatibility — new callers should prefer createDatabaseFromCsvWithHost. */
export const createDatabaseFromCsv = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    headers: v.array(v.string()),
    rows: v.array(v.array(v.string())),
  },
  handler: async (ctx, { userId, name, headers, rows }) => {
    const dbId = await insertDb(ctx, userId, name, headers, rows);
    return String(dbId);
  },
});

/** Track a stored blob as imported file owned by user. */
export const recordFileOwnership = internalMutation({
  args: { userId: v.id("users"), storageId: v.string() },
  handler: async (ctx, { userId, storageId }) => {
    const existing = await ctx.db
      .query("files")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("files", {
      userId,
      storageId,
      createdAt: Date.now(),
    });
  },
});
