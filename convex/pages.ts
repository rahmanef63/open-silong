import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAuth, requireOwned, requireWorkspaceAccess } from "./_shared/auth";
import { rateLimit } from "./_shared/rateLimit";
import { Id } from "./_generated/dataModel";
import { buildSearchText } from "./features/search/lib";
import { collectDescendantsFromDocs } from "./_shared/pageTree";
import { regenAllBlockIds, findDuplicateBlockId, type BlockLike } from "./_shared/blocks";
import { CHAR_CAPS, COUNT_CAPS, RATE_LIMITS, SHARE_SLUG_RE } from "./_shared/limits";
import {
  getActiveWorkspaceMutation,
  readActiveWorkspace,
  pagesInActiveWorkspace,
  requireActiveWorkspaceWritable,
} from "./_shared/workspace";
import { uid } from "./_shared/uid";

function emptyBlock() {
  return { id: uid(), type: "paragraph", text: "" };
}

/** Pulls every page in the same scope as the doc being mutated — by
 *  workspace if the doc is workspace-stamped, otherwise the viewer's
 *  legacy by_user pool. Used by the descendant-walking mutations
 *  (trash / restore / permanentlyDelete) so subpages created by other
 *  members get included. */
async function collectScopedPages(
  ctx: { db: any },
  userId: Id<"users">,
  workspaceId: Id<"workspaces"> | undefined,
) {
  if (workspaceId) {
    return await ctx.db
      .query("pages")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", workspaceId))
      .collect();
  }
  return await ctx.db
    .query("pages")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
}

/**
 * Anonymous-readable public share. Accepts either the convex id OR a
 * custom slug stored on `pages.shareSlug`. Returns a DTO (no userId,
 * searchText, rowProps, rowOfDatabaseId) only when isPublic && !trashed.
 */
export const getPublicShare = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    let doc = null;
    // Try convex id form first — only if the string matches the
    // standard convex id shape (no hyphens, mixed case-insensitive).
    if (/^[a-z0-9]{20,}$/i.test(id)) {
      try { doc = await ctx.db.get(id as Id<"pages">); } catch { /* fallthrough to slug */ }
    }
    if (!doc) {
      doc = await ctx.db
        .query("pages")
        .withIndex("by_share_slug", (q) => q.eq("shareSlug", id))
        .unique();
    }
    if (!doc || doc.trashed || !doc.isPublic) return null;
    return {
      _id: doc._id,
      title: doc.title,
      icon: doc.icon,
      cover: doc.cover,
      blocks: doc.blocks,
      font: doc.font,
      smallText: doc.smallText,
      fullWidth: doc.fullWidth,
      updatedAt: doc.updatedAt,
      shareSlug: doc.shareSlug,
      shareIndexable: doc.shareIndexable ?? false,
    };
  },
});

/** Toggle whether the public share allows search-engine indexing. */
export const setShareIndexable = mutation({
  args: { pageId: v.id("pages"), indexable: v.boolean() },
  handler: async (ctx, { pageId, indexable }) => {
    await requireWorkspaceAccess(ctx, "pages", pageId as Id<"pages">, { write: true });
    await ctx.db.patch(pageId as Id<"pages">, { shareIndexable: indexable, updatedAt: Date.now() });
    return { indexable };
  },
});

/** Set or clear the custom share slug for a page. Slug must be 3–60
 *  chars, lowercase + digits + hyphens, not starting/ending with hyphen.
 *  Empty string clears the slug. Throws on collision with another page. */
export const setShareSlug = mutation({
  args: { pageId: v.id("pages"), slug: v.string() },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const slug = args.slug.trim().toLowerCase();
    if (!slug) {
      await ctx.db.patch(args.pageId as Id<"pages">, { shareSlug: undefined, updatedAt: Date.now() });
      return { slug: null };
    }
    if (!SHARE_SLUG_RE.test(slug)) {
      throw new Error(`Slug must be ${CHAR_CAPS.shareSlugMin}–${CHAR_CAPS.shareSlugMax} chars: lowercase letters, digits, hyphens (not at edges)`);
    }
    if (slug.length < CHAR_CAPS.shareSlugMin) throw new Error(`Slug too short (min ${CHAR_CAPS.shareSlugMin} chars)`);
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", slug))
      .unique();
    if (existing && existing._id !== (args.pageId as Id<"pages">)) {
      throw new Error("That slug is already taken — pick another.");
    }
    await ctx.db.patch(args.pageId as Id<"pages">, { shareSlug: slug, updatedAt: Date.now() });
    return { slug };
  },
});

/** Workspace-scoped full list — includes `blocks` and `searchText`.
 *  Heavy. Prefer `listMeta` for tree / sidebar / palette callers.
 *  Returns every page in the viewer's active workspace they are a
 *  member of (any role), regardless of which member created it.
 *  Anonymous → []. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return [];
    return await pagesInActiveWorkspace(ctx, userId, active);
  },
});

/** Anonymous-readable. Returns the bare minimum for sitemap entries —
 *  page id, optional slug, updatedAt. Capped + only published pages. */
export const listPublicForSitemap = query({
  args: {},
  handler: async (ctx) => {
    // No userId scope — sitemap should expose all public-published pages.
    // Keep the projection tight; trashed pages never make it through.
    const docs = await ctx.db.query("pages").take(2_000);
    return docs
      .filter((d) => d.isPublic && !d.trashed && d.shareIndexable === true)
      .map((d) => ({ id: d._id as string, slug: d.shareSlug, updatedAt: d.updatedAt }))
      .slice(0, 1_000);
  },
});

/** Slim DTO for sidebar/dashboard/list views. Excludes `blocks` +
 *  `searchText` — those are the 95% payload only the active page
 *  editor needs (use `pages.getById(id)` for the full doc).
 *
 *  `rowProps` IS included — it's small (one map per row) and database
 *  views (Table / Board / Calendar / etc.) read every row's rowProps
 *  to render cell values. Skipping it broke the whole database UI. */
export const listMeta = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return [];
    const docs = await pagesInActiveWorkspace(ctx, userId, active);
    return docs.map((d) => ({
      _id: d._id,
      _creationTime: d._creationTime,
      userId: d.userId,
      parentId: d.parentId,
      title: d.title,
      icon: d.icon,
      cover: d.cover,
      favorite: d.favorite,
      trashed: d.trashed,
      isPublic: d.isPublic,
      shareSlug: d.shareSlug,
      rowOfDatabaseId: d.rowOfDatabaseId,
      rowProps: d.rowProps,
      font: d.font,
      smallText: d.smallText,
      fullWidth: d.fullWidth,
      locked: d.locked,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      /** Cheap derived signal: does this page host any database block?
       *  Used by callers that need to find a database's host page without
       *  scanning all blocks of all pages. */
      databaseHostFor: (d.blocks as any[])
        .filter((b) => b?.type === "database" && b?.databaseId)
        .map((b) => b.databaseId as string),
      /** Block count for cheap previews. */
      blockCount: (d.blocks as any[]).length,
      /** First text-bearing block, truncated. Lets dashboard show snippets
       *  without shipping the full blocks array. */
      previewText: (() => {
        for (const b of d.blocks as any[]) {
          if (typeof b?.text === "string" && b.text.trim()) return b.text.slice(0, 120);
        }
        return "";
      })(),
    }));
  },
});

/** Full page doc for the editor. Subscribe to a single page so block edits
 *  on this page don't re-broadcast all other pages. */
export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    let doc;
    try {
      doc = await ctx.db.get(id as Id<"pages">);
    } catch {
      return null;
    }
    if (!doc) return null;
    // Membership-aware: any member of the page's workspace can read.
    // Legacy unstamped rows fall back to owner-only.
    if (doc.workspaceId) {
      const m = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_user_workspace", (q) =>
          q.eq("userId", userId).eq("workspaceId", doc.workspaceId!),
        )
        .unique();
      if (!m) return null;
    } else if (doc.userId !== userId) {
      return null;
    }
    return doc;
  },
});

/** Insert a new page. Seeds one empty paragraph block + searchText.
 *  When `rowOfDatabaseId` is set, the page becomes a database row
 *  (initializes `rowProps: {}`).
 *  Rate limit: 60/min/user (`pages.create`).
 *  Returns the bare `Id<"pages">` (NOT wrapped). */
export const create = mutation({
  args: {
    parentId: v.union(v.id("pages"), v.null()),
    title: v.optional(v.string()),
    icon: v.optional(v.string()),
    rowOfDatabaseId: v.optional(v.id("databases")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await rateLimit(ctx, userId, RATE_LIMITS.pagesCreate);
    const active = await requireActiveWorkspaceWritable(ctx, userId);
    const now = Date.now();
    const blocks = [emptyBlock()];
    const pageId = await ctx.db.insert("pages", {
      userId,
      workspaceId: active._id,
      parentId: args.parentId as Id<"pages"> | null,
      title: args.title ?? "",
      icon: args.icon ?? "lucide:FileText",
      cover: null,
      blocks,
      favorite: false,
      trashed: false,
      isPublic: false,
      rowOfDatabaseId: args.rowOfDatabaseId as Id<"databases"> | undefined,
      rowProps: args.rowOfDatabaseId ? {} : undefined,
      searchText: buildSearchText(args.title, blocks),
      createdAt: now,
      updatedAt: now,
    });
    // Fire-and-forget webhook fan-out — no await blocks the caller.
    await ctx.scheduler.runAfter(0, internal.webhooks.deliver.run, {
      ownerId: userId,
      event: "page.created",
      payload: { pageId, title: args.title ?? "", parentId: args.parentId },
    });
    return pageId;
  },
});

/**
 * Page content patch. Whitelisted fields only — userId / isPublic / trashed
 * / rowOfDatabaseId / createdAt cannot be flipped via this mutation. Use
 * setPublic / trash / restore for those state transitions.
 */
export const update = mutation({
  args: {
    pageId: v.id("pages"),
    patch: v.object({
      title: v.optional(v.string()),
      icon: v.optional(v.string()),
      cover: v.optional(v.union(
        v.string(),
        v.null(),
        v.object({
          type: v.string(),
          value: v.string(),
          positionY: v.optional(v.number()),
          metadata: v.optional(v.any()),
        }),
      )),
      blocks: v.optional(v.array(v.any())),
      layouts: v.optional(v.array(v.object({
        id: v.string(),
        type: v.literal("columns"),
        count: v.number(),
        widths: v.optional(v.array(v.number())),
      }))),
      favorite: v.optional(v.boolean()),
      parentId: v.optional(v.union(v.id("pages"), v.null())),
      font: v.optional(v.string()),
      smallText: v.optional(v.boolean()),
      fullWidth: v.optional(v.boolean()),
      locked: v.optional(v.boolean()),
      rowProps: v.optional(v.any()),
      databaseHostFor: v.optional(v.array(v.id("databases"))),
      // Manual sort uses createdAt as the order key; reorder undo restores it.
      createdAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    if (args.patch.title !== undefined && args.patch.title.length > CHAR_CAPS.pageTitle) {
      throw new Error("Title too long");
    }
    if (args.patch.blocks !== undefined && args.patch.blocks.length > COUNT_CAPS.blocksPerPage) {
      throw new Error(`Page exceeds block cap (${COUNT_CAPS.blocksPerPage})`);
    }
    const { userId, doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const nextTitle = args.patch.title ?? page.title;
    const nextBlocks = args.patch.blocks ?? page.blocks;
    const touchesContent = "title" in args.patch || "blocks" in args.patch;
    await ctx.db.patch(args.pageId as Id<"pages">, {
      ...args.patch,
      ...(touchesContent ? { searchText: buildSearchText(nextTitle, nextBlocks) } : {}),
      updatedAt: Date.now(),
    });
    if (touchesContent) {
      await ctx.scheduler.runAfter(0, internal.webhooks.deliver.run, {
        ownerId: userId,
        event: "page.updated",
        payload: {
          pageId: args.pageId,
          title: nextTitle,
          changedFields: Object.keys(args.patch),
        },
      });
    }
  },
});

/** Toggle public-share status. Carved out of update() so the public flip
 *  cannot piggyback on a routine content patch. Rate-limited
 *  (`pagesSetPublic`) — toggling 100×/min would hammer downstream
 *  share-page CDNs / OG-image edge regenerations. */
export const setPublic = mutation({
  args: { pageId: v.id("pages"), isPublic: v.boolean() },
  handler: async (ctx, { pageId, isPublic }) => {
    const { userId } = await requireWorkspaceAccess(ctx, "pages", pageId as Id<"pages">, { write: true });
    await rateLimit(ctx, userId, RATE_LIMITS.pagesSetPublic);
    await ctx.db.patch(pageId as Id<"pages">, { isPublic, updatedAt: Date.now() });
  },
});

/** Soft-delete `pageId` and ALL descendants. Walks `parentId` over the
 *  user's owned pages via `collectDescendantsFromDocs`. Cron
 *  `maintenance.purgeStaleTrash` permanently deletes after 30 days.
 *  Touches `updatedAt`. */
export const trash = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const { userId, doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const allPages = await collectScopedPages(ctx, userId, page.workspaceId);
    const ids = collectDescendantsFromDocs(allPages, args.pageId);
    const now = Date.now();
    for (const id of ids) {
      await ctx.db.patch(id as Id<"pages">, { trashed: true, updatedAt: now });
    }
    await ctx.scheduler.runAfter(0, internal.webhooks.deliver.run, {
      ownerId: userId,
      event: "page.deleted",
      payload: { pageId: args.pageId, title: page.title, soft: true, cascadeCount: ids.length },
    });
  },
});

/** Inverse of `trash`. Restores the entire descendant tree.
 *  Does NOT touch `updatedAt` — restoring shouldn't bump the page to
 *  top of recents. Does NOT re-parent orphans (parent might still be
 *  trashed) — caller responsibility. */
export const restore = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const { userId, doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const allPages = await collectScopedPages(ctx, userId, page.workspaceId);
    const ids = collectDescendantsFromDocs(allPages, args.pageId);
    for (const id of ids) {
      await ctx.db.patch(id as Id<"pages">, { trashed: false });
    }
  },
});

/** Recursively delete `pageId` + descendants AND every snapshot
 *  referencing those pages (`snapshots.by_user_page` index). One-way. */
export const permanentlyDelete = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const { userId, doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const allPages = await collectScopedPages(ctx, userId, page.workspaceId);
    const ids = collectDescendantsFromDocs(allPages, args.pageId);
    for (const id of ids) {
      // Snapshot cleanup is best-effort — only the viewer's own snapshots get
      // deleted (snapshots are author-owned, no by_workspace index yet).
      // Other members' snapshots become orphaned; session-2 snapshot scoping
      // will fix the leak.
      const snaps = await ctx.db.query("snapshots").withIndex("by_user_page", (q) => q.eq("userId", userId).eq("pageId", id as Id<"pages">)).collect();
      for (const s of snaps) await ctx.db.delete(s._id);
      await ctx.db.delete(id as Id<"pages">);
    }
    await ctx.scheduler.runAfter(0, internal.webhooks.deliver.run, {
      ownerId: userId,
      event: "page.deleted",
      payload: { pageId: args.pageId, title: page.title, soft: false, cascadeCount: ids.length },
    });
  },
});

/** Deep-clone `pageId` with fresh block ids — recursively across
 *  `children` and `columns` (uses `regenAllBlockIds`). Title gets
 *  " (copy)" suffix. Inherits `isPublic`/`rowOfDatabaseId`/`rowProps`
 *  from source. Rate-limited (`pagesDuplicate`). Returns the new
 *  `Id<"pages">`. */
export const duplicate = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const { userId, doc: src } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    await rateLimit(ctx, userId, RATE_LIMITS.pagesDuplicate);
    const now = Date.now();
    const cloned = JSON.parse(JSON.stringify(src.blocks)) as BlockLike[];
    const blocks = regenAllBlockIds(cloned);
    const title = src.title ? `${src.title} (copy)` : "";
    const active = await getActiveWorkspaceMutation(ctx, userId);
    return await ctx.db.insert("pages", {
      userId,
      workspaceId: src.workspaceId ?? active._id,
      parentId: src.parentId,
      title,
      icon: src.icon,
      cover: src.cover,
      blocks,
      favorite: false,
      trashed: false,
      isPublic: src.isPublic,
      rowOfDatabaseId: src.rowOfDatabaseId,
      rowProps: src.rowProps ? JSON.parse(JSON.stringify(src.rowProps)) : undefined,
      searchText: buildSearchText(title, blocks),
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Insert a new block at `afterIndex + 1` in `page.blocks`. Default
 *  type `paragraph`. `init` patches over the new block (frontend
 *  drives shape — see `Block` in types/domain.md).
 *  Rebuilds `searchText`. Returns the new block id. */
export const addBlock = mutation({
  args: {
    pageId: v.id("pages"),
    afterIndex: v.number(),
    type: v.optional(v.string()),
    init: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const newId = uid();
    const blocks = [...page.blocks];
    blocks.splice(args.afterIndex + 1, 0, {
      id: newId,
      type: args.type ?? "paragraph",
      text: "",
      checked: args.type === "todo" ? false : undefined,
      ...(args.init ?? {}),
    });
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      searchText: buildSearchText(page.title, blocks),
      updatedAt: Date.now(),
    });
    return newId;
  },
});

/** Splice an array of new blocks into `page.blocks` after the anchor.
 *  Used by the markdown-paste handler so multi-block paste lands as a
 *  single atomic write (vs N sequential addBlock round-trips that risk
 *  reverse ordering). When `replaceAnchor` is true, the anchor block
 *  is removed and the FIRST incoming block takes its slot — used when
 *  the user pastes into an empty paragraph.
 *
 *  When the incoming blocks carry `layoutGroup` / `layoutCol`, they
 *  propagate as-is; otherwise the layout stamps from the anchor block
 *  are inherited so a paste inside a column stays in the column.
 */
export const insertBlocksAfter = mutation({
  args: {
    pageId: v.id("pages"),
    anchorBlockId: v.string(),
    blocks: v.array(v.any()),
    replaceAnchor: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const cur = page.blocks as Array<{ id: string; layoutGroup?: string; layoutCol?: number }>;
    const idx = cur.findIndex((b) => b.id === args.anchorBlockId);
    if (idx < 0) throw new Error("Anchor block not found");
    const anchor = cur[idx];
    // Inherit layout stamps from the anchor when incoming blocks
    // don't already carry their own.
    const stamped = args.blocks.map((b) => {
      const out = { ...b };
      if (out.layoutGroup == null && anchor.layoutGroup != null) {
        out.layoutGroup = anchor.layoutGroup;
        out.layoutCol = anchor.layoutCol;
      }
      return out;
    });
    const blocks = args.replaceAnchor
      ? [...cur.slice(0, idx), ...stamped, ...cur.slice(idx + 1)]
      : [...cur.slice(0, idx + 1), ...stamped, ...cur.slice(idx + 1)];
    if (blocks.length > COUNT_CAPS.blocksPerPage) throw new Error(`Page exceeds block cap (${COUNT_CAPS.blocksPerPage})`);
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      searchText: buildSearchText(page.title, blocks),
      updatedAt: Date.now(),
    });
    return blocks.length;
  },
});

/** Patch a single block by id. `patch` merges over the existing block.
 *  `searchText` rebuilt only when patch touches `text`/`type`/`lang`/
 *  `caption` — style-only patches (color/bgColor/width/align/collapsed)
 *  skip the O(blocks) string build (color picker fires per drag). */
export const updateBlock = mutation({
  args: { pageId: v.id("pages"), blockId: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const { userId, doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const blocks = page.blocks.map((b: any) =>
      b.id === args.blockId ? { ...b, ...args.patch } : b
    );
    // Only rebuild searchText when the patch touches text-bearing fields.
    // Toggle/reorder/style-only patches skip the O(blocks) string build.
    const TEXT_FIELDS = ["text", "type", "lang", "caption"];
    const touchesText = Object.keys(args.patch ?? {}).some((k) => TEXT_FIELDS.includes(k));
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      ...(touchesText ? { searchText: buildSearchText(page.title, blocks) } : {}),
      updatedAt: Date.now(),
    });
  },
});

/** Remove block by id. If the page would become empty, seeds one
 *  paragraph so cursor always has somewhere to land. Rebuilds
 *  `searchText`. */
export const deleteBlock = mutation({
  args: { pageId: v.id("pages"), blockId: v.string() },
  handler: async (ctx, args) => {
    const { userId, doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    let blocks = page.blocks.filter((b: any) => b.id !== args.blockId);
    if (!blocks.length) blocks = [emptyBlock()];
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      searchText: buildSearchText(page.title, blocks),
      updatedAt: Date.now(),
    });
  },
});

/** Shuffle `page.blocks` to match `orderedIds`. Blocks not in the list
 *  are dropped silently. Used by dnd-kit drop handler. Does NOT
 *  rebuild `searchText` — reorder preserves the word set. */
export const reorderBlocks = mutation({
  args: { pageId: v.id("pages"), orderedIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const { userId, doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const map = new Map(page.blocks.map((b: any) => [b.id, b]));
    const blocks = args.orderedIds.map((id) => map.get(id)).filter(Boolean);
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      // searchText unchanged — reorder doesn't change set of words
      updatedAt: Date.now(),
    });
  },
});
