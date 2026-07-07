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

import { internalQuery, internalMutation, type QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { buildSearchText } from "../features/search/lib";
import { regenAllBlockIds, type BlockLike } from "../_shared/blocks";
import { CHAR_CAPS, COUNT_CAPS } from "../_shared/limits";
import { uid } from "../_shared/uid";
// Static import — dynamic `await import("../_shared/markdown")` throws
// "dynamic module import unsupported" inside Convex internal mutations.
import { markdownToBlocks } from "../_shared/markdown";
import { getActiveWorkspaceMutation } from "../_shared/workspace";
// Memory-graph edge index + pure graph algorithms. The write mutations
// below reindex a page's outgoing links after mutating its blocks; the
// read queries build the Graph shape + BFS ego graphs the MCP graph_*
// tools return.
import { reindexPageLinks, slug } from "../_shared/links";
import {
  buildGraphFromEdges,
  buildAdjacency,
  bfs,
  type Graph,
  type GraphPageMeta,
} from "../_shared/graph";

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

// ─── Memory graph ──────────────────────────────────────────────────
//
// Read queries answer the graph_* MCP tools; write mutations make the
// graph a WRITABLE agent memory. All gate ownership inline via the
// explicit `userId` arg (same pattern as the rest of this file — the
// Convex auth ctx is empty on the MCP bearer path). MCP is per-USER
// across all the user's workspaces (matches `listPages`), so the graph
// collection walks the `by_user` page index, not a single workspace.

/** Max backlink/outgoing edge rows returned for one page. */
const GRAPH_LINKS_CAP = 1_000;
/** Max pages scanned when assembling the per-user graph (global/neighbors/related). */
const GRAPH_PAGE_CAP = 1_000;
/** Max outgoing edges collected per source page during that assembly. */
const GRAPH_EDGES_PER_PAGE = 200;
/** Default / hard-max node count for `graph_global`. */
const GRAPH_NODE_LIMIT_DEFAULT = 500;
const GRAPH_NODE_LIMIT_MAX = 2_000;
/** Local-graph BFS depth ceiling. */
const GRAPH_DEPTH_MAX = 3;
/** Max related notes returned by `graph_related`. */
const RELATED_MAX = 20;

/** `#tag` char rule — mirrors `TAG_RE` capture in `_shared/links.ts`. */
const TAG_CHAR_RE = /^[A-Za-z0-9_][A-Za-z0-9_/-]*$/;

/** Strip a leading `#`, trim, validate. Returns null when not a legal tag. */
function normalizeTag(raw: string): string | null {
  const t = String(raw ?? "").replace(/^#+/, "").trim();
  return t && TAG_CHAR_RE.test(t) ? t : null;
}

function cleanTags(tags?: string[]): string[] {
  const out: string[] = [];
  for (const raw of tags ?? []) {
    const n = normalizeTag(raw);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/** Strip surrounding `[[ ]]` if the caller already wrapped the target. */
function stripWikiBrackets(s: string): string {
  return String(s ?? "").replace(/^\s*\[\[/, "").replace(/\]\]\s*$/, "").trim();
}

/** Assemble the per-user graph: every live page owned by `userId` (node
 *  meta) plus its outgoing `pageLinks` rows (edges). Bounded by the caps
 *  above — the source-edge fan-out uses the `by_source` index per page. */
async function collectUserGraph(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<{ edges: Doc<"pageLinks">[]; pages: GraphPageMeta[] }> {
  const allPages = await ctx.db
    .query("pages")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(GRAPH_PAGE_CAP);
  const live = allPages.filter((p) => !p.trashed);
  const pages: GraphPageMeta[] = live.map((p) => ({
    _id: p._id,
    title: p.title,
    icon: p.icon,
    wiki: p.wiki,
  }));
  const edges: Doc<"pageLinks">[] = [];
  for (const p of live) {
    const rows = await ctx.db
      .query("pageLinks")
      .withIndex("by_source", (q) => q.eq("sourcePageId", p._id))
      .take(GRAPH_EDGES_PER_PAGE);
    for (const r of rows) edges.push(r);
  }
  return { edges, pages };
}

/** Pages linking TO this page (incoming resolved edges). `by_target`. */
export const graphBacklinks = internalQuery({
  args: { userId: v.id("users"), pageId: v.string() },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.pageId as Id<"pages">);
    if (!target || target.userId !== args.userId) return { backlinks: [] };
    const rows = await ctx.db
      .query("pageLinks")
      .withIndex("by_target", (q) => q.eq("targetPageId", args.pageId as Id<"pages">))
      .take(GRAPH_LINKS_CAP);
    const backlinks: Array<{
      pageId: string; title: string; icon: string; kind: string; blockId?: string;
    }> = [];
    for (const r of rows) {
      const src = await ctx.db.get(r.sourcePageId);
      if (!src || src.userId !== args.userId || src.trashed) continue;
      backlinks.push({
        pageId: src._id,
        title: src.title || "Untitled",
        icon: src.icon,
        kind: r.kind,
        blockId: r.sourceBlockId || undefined,
      });
    }
    return { backlinks };
  },
});

/** Outgoing links from this page — resolved page targets, unresolved
 *  ghost titles, and tags. `by_source`. */
export const graphOutgoing = internalQuery({
  args: { userId: v.id("users"), pageId: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== args.userId) return { links: [] };
    const rows = await ctx.db
      .query("pageLinks")
      .withIndex("by_source", (q) => q.eq("sourcePageId", args.pageId as Id<"pages">))
      .take(GRAPH_LINKS_CAP);
    const links: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      if (r.kind === "tag") {
        links.push({ kind: "tag", tag: r.tag, resolved: true, blockId: r.sourceBlockId || undefined });
        continue;
      }
      let targetTitle = r.targetTitle;
      let icon: string | undefined;
      if (r.resolved && r.targetPageId) {
        const t = await ctx.db.get(r.targetPageId);
        if (t && t.userId === args.userId && !t.trashed) {
          targetTitle = t.title || "Untitled";
          icon = t.icon;
        }
      }
      links.push({
        kind: r.kind,
        resolved: r.resolved,
        targetPageId: r.targetPageId ?? undefined,
        targetTitle,
        icon,
        blockId: r.sourceBlockId || undefined,
      });
    }
    return { links };
  },
});

/** Local (ego) subgraph — BFS n-hop around a page. */
export const graphNeighbors = internalQuery({
  args: { userId: v.id("users"), pageId: v.string(), depth: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Graph> => {
    const root = await ctx.db.get(args.pageId as Id<"pages">);
    if (!root || root.userId !== args.userId) return { nodes: [], edges: [] };
    const depth = Math.min(Math.max(Math.floor(args.depth ?? 1), 1), GRAPH_DEPTH_MAX);
    const { edges, pages } = await collectUserGraph(ctx, args.userId);
    const full = buildGraphFromEdges(edges, pages, {
      includeTags: true,
      includeGhosts: true,
      includeOrphans: true,
    });
    const rootId = String(root._id);
    if (!full.nodes.some((n) => n.id === rootId)) return { nodes: [], edges: [] };
    const adj = buildAdjacency(full.edges);
    const keep = bfs(adj, rootId, depth);
    return {
      nodes: full.nodes.filter((n) => keep.has(n.id)),
      edges: full.edges.filter((e) => keep.has(e.source) && keep.has(e.target)),
    };
  },
});

/** Whole memory graph (nodes + edges), highest-degree first up to `limit`. */
export const graphGlobal = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    includeTags: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Graph> => {
    const { edges, pages } = await collectUserGraph(ctx, args.userId);
    const limit = Math.min(
      Math.max(Math.floor(args.limit ?? GRAPH_NODE_LIMIT_DEFAULT), 1),
      GRAPH_NODE_LIMIT_MAX,
    );
    return buildGraphFromEdges(edges, pages, {
      includeTags: args.includeTags ?? false,
      includeGhosts: true,
      includeOrphans: true,
      limit,
    });
  },
});

/** All tags + page counts, from the denormalized `pages.tags`. */
export const graphTags = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(GRAPH_PAGE_CAP);
    const counts = new Map<string, number>();
    for (const p of pages) {
      if (p.trashed) continue;
      for (const t of p.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const tags = Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    return { tags };
  },
});

/** Pages carrying a given tag (denormalized `pages.tags`). */
export const graphByTag = internalQuery({
  args: { userId: v.id("users"), tag: v.string() },
  handler: async (ctx, args) => {
    const tag = normalizeTag(args.tag);
    if (!tag) return { pages: [] };
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(GRAPH_PAGE_CAP);
    const out: Array<{ pageId: string; title: string; icon: string }> = [];
    for (const p of pages) {
      if (p.trashed) continue;
      if ((p.tags ?? []).includes(tag)) {
        out.push({ pageId: p._id, title: p.title || "Untitled", icon: p.icon });
      }
    }
    return { pages: out };
  },
});

/** Notes that mention this page's TITLE in their text but don't link it.
 *  Full-text search on the title minus pages that already link here. */
export const graphUnlinkedMentions = internalQuery({
  args: { userId: v.id("users"), pageId: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== args.userId) return { mentions: [] };
    const title = (page.title ?? "").trim();
    if (!title) return { mentions: [] };
    // Pages already linking to this one — exclude them (they're "linked").
    const linkedRows = await ctx.db
      .query("pageLinks")
      .withIndex("by_target", (q) => q.eq("targetPageId", args.pageId as Id<"pages">))
      .take(GRAPH_LINKS_CAP);
    const linked = new Set<string>(linkedRows.map((r) => String(r.sourcePageId)));
    const q = title.slice(0, CHAR_CAPS.searchQuery);
    const results = await ctx.db
      .query("pages")
      .withSearchIndex("search_content", (s) =>
        s.search("searchText", q).eq("userId", args.userId).eq("trashed", false),
      )
      .take(COUNT_CAPS.searchResultMax);
    const mentions: Array<{ pageId: string; title: string; icon: string; snippet: string }> = [];
    for (const r of results) {
      if (String(r._id) === String(page._id)) continue;
      if (linked.has(String(r._id))) continue;
      mentions.push({
        pageId: r._id,
        title: r.title || "Untitled",
        icon: r.icon,
        snippet: (r.searchText ?? "").slice(0, 200),
      });
    }
    return { mentions };
  },
});

/** Notes related by shared tags / co-citation — 2-hop BFS neighbours,
 *  ranked by global degree (recall for an agent). */
export const graphRelated = internalQuery({
  args: { userId: v.id("users"), pageId: v.string() },
  handler: async (ctx, args) => {
    const root = await ctx.db.get(args.pageId as Id<"pages">);
    if (!root || root.userId !== args.userId) return { related: [] };
    const { edges, pages } = await collectUserGraph(ctx, args.userId);
    const full = buildGraphFromEdges(edges, pages, {
      includeTags: true,
      includeGhosts: false,
      includeOrphans: false,
    });
    const rootId = String(root._id);
    if (!full.nodes.some((n) => n.id === rootId)) return { related: [] };
    const adj = buildAdjacency(full.edges);
    const within2 = bfs(adj, rootId, 2);
    const direct = bfs(adj, rootId, 1);
    const nodeById = new Map(full.nodes.map((n) => [n.id, n]));
    const related: Array<{
      pageId: string; title: string; icon: string; direct: boolean; score: number;
    }> = [];
    for (const id of within2) {
      if (id === rootId) continue;
      const node = nodeById.get(id);
      if (!node || node.kind !== "page") continue;
      related.push({
        pageId: id,
        title: node.title,
        icon: node.icon,
        direct: direct.has(id),
        score: node.degree,
      });
    }
    related.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    return { related: related.slice(0, RELATED_MAX) };
  },
});

/** Create a note already wired into the graph — body markdown + appended
 *  `[[links]]` + `#tags`, then reindex so its edges land in `pageLinks`. */
export const createLinkedNote = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    markdown: v.optional(v.string()),
    links: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const title = args.title;
    if (title.length > CHAR_CAPS.pageTitle) throw new Error("Title too long");
    const ws = await getActiveWorkspaceMutation(ctx, args.userId);

    // Assemble body: base markdown, then a wikilink line per link, then a
    // single line of #tags. `#tag` (no space) stays a paragraph — a lone
    // `# ` at line start would become an h1, so we never emit that.
    const parts: string[] = [];
    if (args.markdown && args.markdown.trim()) parts.push(args.markdown.trim());
    const links = (args.links ?? []).map(stripWikiBrackets).filter(Boolean);
    if (links.length) parts.push(links.map((l) => `[[${l}]]`).join("\n"));
    const tags = cleanTags(args.tags);
    if (tags.length) parts.push(tags.map((t) => `#${t}`).join(" "));
    const bodyMd = parts.join("\n\n");

    const blocks: BlockLike[] = bodyMd.trim()
      ? (markdownToBlocks(bodyMd) as BlockLike[])
      : [{ id: uid(), type: "paragraph", text: "" }];
    if (blocks.length > COUNT_CAPS.blocksPerPage) {
      throw new Error(`Page would exceed block cap (${COUNT_CAPS.blocksPerPage})`);
    }

    const now = Date.now();
    const pageId = await ctx.db.insert("pages", {
      userId: args.userId,
      workspaceId: ws._id,
      parentId: null,
      title,
      icon: args.icon?.trim() || "📄",
      cover: null,
      blocks,
      favorite: false,
      trashed: false,
      isPublic: false,
      titleKey: slug(title),
      searchText: buildSearchText(title, blocks),
      createdAt: now,
      updatedAt: now,
    });
    // Reindex AFTER the doc is patched so edges reference the final blocks.
    const doc = await ctx.db.get(pageId);
    if (doc) await reindexPageLinks(ctx, doc);
    return pageId;
  },
});

/** Append `[[to]]` into a note and reindex. `to` may be a pageId (linked
 *  by that page's title so it resolves) or a literal title (ghost until
 *  a page with that title exists). */
export const addLink = internalMutation({
  args: {
    userId: v.id("users"),
    fromPageId: v.string(),
    to: v.string(),
    alias: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.fromPageId as Id<"pages">);
    if (!page || page.userId !== args.userId) throw new Error("Tidak ditemukan");

    let title = stripWikiBrackets(args.to);
    const maybeId = ctx.db.normalizeId("pages", args.to);
    if (maybeId) {
      const target = await ctx.db.get(maybeId);
      if (target && target.userId === args.userId) title = target.title || title;
    }
    if (!title) throw new Error("link target is empty");

    const alias = args.alias?.trim();
    const token = alias ? `[[${title}|${alias}]]` : `[[${title}]]`;
    const blocks: BlockLike[] = [
      ...(page.blocks as BlockLike[]),
      { id: uid(), type: "paragraph", text: token },
    ];
    if (blocks.length > COUNT_CAPS.blocksPerPage) {
      throw new Error(`Page would exceed block cap (${COUNT_CAPS.blocksPerPage})`);
    }
    await ctx.db.patch(page._id, {
      blocks,
      searchText: buildSearchText(page.title, blocks),
      updatedAt: Date.now(),
    });
    const doc = await ctx.db.get(page._id);
    if (doc) await reindexPageLinks(ctx, doc);
    return { ok: true, linkedTitle: title };
  },
});

/** Add a `#tag` to a note and reindex. Idempotent on the denormalized
 *  `pages.tags` — a second call with the same tag is a no-op write. */
export const addTag = internalMutation({
  args: { userId: v.id("users"), pageId: v.string(), tag: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== args.userId) throw new Error("Tidak ditemukan");
    const tag = normalizeTag(args.tag);
    if (!tag) throw new Error("Invalid tag");
    if ((page.tags ?? []).includes(tag)) {
      return { ok: true, tag, alreadyPresent: true };
    }

    const token = `#${tag}`;
    const blocks = [...(page.blocks as BlockLike[])];
    // Prefer appending to the last paragraph so tags cluster; never touch a
    // heading/other block type (would rewrite its rendered text).
    let idx = -1;
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      if ((b.type === "paragraph" || b.type === undefined) && typeof b.text === "string") {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      const b = blocks[idx] as BlockLike & { text: string };
      blocks[idx] = { ...b, text: b.text ? `${b.text} ${token}` : token };
    } else {
      blocks.push({ id: uid(), type: "paragraph", text: token });
    }
    if (blocks.length > COUNT_CAPS.blocksPerPage) {
      throw new Error(`Page would exceed block cap (${COUNT_CAPS.blocksPerPage})`);
    }
    await ctx.db.patch(page._id, {
      blocks,
      searchText: buildSearchText(page.title, blocks),
      updatedAt: Date.now(),
    });
    const doc = await ctx.db.get(page._id);
    if (doc) await reindexPageLinks(ctx, doc);
    return { ok: true, tag };
  },
});
