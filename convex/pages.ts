import { mutation, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAuth, requireOwned, requireWorkspaceAccess } from "./_shared/auth";
import { rateLimit } from "./_shared/rateLimit";
import { Id, Doc } from "./_generated/dataModel";
import { buildSearchText } from "./features/search/lib";
import {
  readPageBlocks, writePageBlocks, insertPageBlocks, newPageBlockFields, pageMetaOf,
  deletePageBlocks,
} from "./_shared/pageContent";
import { reindexPageLinks, titleKeyFor } from "./_shared/links";
import { regenAllBlockIds, findDuplicateBlockId, type BlockLike } from "./_shared/blocks";
import {
  addBlockToArray, replaceBlockInArray, duplicateBlockInArray,
  insertBlocksAfterAnchor, updateBlockInArray, deleteBlockFromArray,
  reorderBlocksInArray, type BlockLike as BlockOpLike,
} from "./_shared/blockOps";
import { CHAR_CAPS, COUNT_CAPS, RATE_LIMITS, SHARE_SLUG_RE } from "./_shared/limits";
import { markdownToBlocks } from "./_shared/markdown";
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

/** `rootId` + every descendant reachable via `parentId`, walked by index
 *  within the doc's scope (by_workspace_parent when the root is workspace-
 *  stamped, otherwise the viewer's legacy by_user_parent pool). Used by the
 *  descendant-walking mutations (trash / restore / permanentlyDelete).
 *
 *  Replaces the old whole-scope `.collect()`: trashing one leaf page used to
 *  read EVERY page in the workspace into memory (and threw once the workspace
 *  exceeded a mutation's read budget). This reads only the target subtree.
 *  Each level is FULLY paginated — never capped — so no subpage is silently
 *  orphaned in a cascade, and a visited-set guards corrupt self-referential
 *  parent chains. */
async function collectDescendantIds(
  ctx: MutationCtx,
  rootId: Id<"pages">,
  userId: Id<"users">,
  workspaceId: Id<"workspaces"> | undefined,
): Promise<Id<"pages">[]> {
  const visited = new Set<string>([rootId]);
  const out: Id<"pages">[] = [rootId];
  let frontier: Id<"pages">[] = [rootId];
  while (frontier.length) {
    const next: Id<"pages">[] = [];
    for (const parentId of frontier) {
      let cursor: string | null = null;
      for (;;) {
        // Narrow indexed range = one parent's direct children only.
        const batch = await (workspaceId
          ? ctx.db.query("pages").withIndex("by_workspace_parent", (q) =>
              q.eq("workspaceId", workspaceId).eq("parentId", parentId))
          : ctx.db.query("pages").withIndex("by_user_parent", (q) =>
              q.eq("userId", userId).eq("parentId", parentId))
        ).paginate({ cursor, numItems: 500 });
        for (const child of batch.page) {
          if (!visited.has(child._id)) {
            visited.add(child._id);
            out.push(child._id);
            next.push(child._id);
          }
        }
        if (batch.isDone) break;
        cursor = batch.continueCursor;
      }
    }
    frontier = next;
  }
  return out;
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
      blocks: await readPageBlocks(ctx, doc),
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

/** Anonymous-readable. Returns the bare minimum for sitemap entries —
 *  page id, optional slug, updatedAt. Capped + only published pages. */
export const listPublicForSitemap = query({
  args: {},
  handler: async (ctx) => {
    // No userId scope — sitemap exposes all public + search-indexable pages.
    // Walk ONLY the by_share_indexable bucket (not the whole table); the
    // residual isPublic/!trashed guard stays in-memory since those aren't
    // in this index. Bounded at the sitemap row cap.
    const docs = await ctx.db
      .query("pages")
      .withIndex("by_share_indexable", (q) => q.eq("shareIndexable", true))
      .take(COUNT_CAPS.sitemapScanRows);
    return docs
      .filter((d) => d.isPublic && !d.trashed)
      .map((d) => ({ id: d._id as string, slug: d.shareSlug, updatedAt: d.updatedAt }))
      .slice(0, COUNT_CAPS.sitemapMaxRows);
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
    return docs.map((d) => {
      // Denormalized meta (blockCount/previewText/databaseHostFor) read from
      // the stored columns — no blocks deserialization. Legacy rows fall back
      // to deriving from `d.blocks` until backfilled.
      const meta = pageMetaOf(d);
      return {
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
        databaseHostFor: meta.databaseHostFor as string[],
        blockCount: meta.blockCount,
        previewText: meta.previewText,
      };
    });
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
    // Explicit editor DTO — return ONLY fields the page subscription's
    // consumers actually read (notion adapter `useOne`, `useWiki`,
    // AI skill handlers). Drops the denorm columns that no getById
    // consumer reads: `searchText` (≤8KB duplicate of block text),
    // `tags`, `titleKey`, `blockCount`, `previewText` — those are
    // `listMeta`-only projections. `blocks` is spliced from the
    // pageBlocks table (falls back to legacy doc.blocks).
    return {
      _id: doc._id,
      _creationTime: doc._creationTime,
      userId: doc.userId,
      workspaceId: doc.workspaceId,
      parentId: doc.parentId,
      title: doc.title,
      icon: doc.icon,
      cover: doc.cover,
      layouts: doc.layouts,
      favorite: doc.favorite,
      trashed: doc.trashed,
      isPublic: doc.isPublic,
      rowOfDatabaseId: doc.rowOfDatabaseId,
      rowProps: doc.rowProps,
      databaseHostFor: doc.databaseHostFor,
      font: doc.font,
      smallText: doc.smallText,
      fullWidth: doc.fullWidth,
      locked: doc.locked,
      shareSlug: doc.shareSlug,
      shareIndexable: doc.shareIndexable,
      wiki: doc.wiki,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      // Cast back to the schema column type so the return shape matches the
      // prior `{ ...doc }` spread — readPageBlocks is intentionally `unknown[]`.
      blocks: (await readPageBlocks(ctx, doc)) as Doc<"pages">["blocks"],
    };
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
    await rateLimit(ctx, userId, RATE_LIMITS.pagesCreateDay);
    const active = await requireActiveWorkspaceWritable(ctx, userId);
    const now = Date.now();
    const blocks = [emptyBlock()];
    const pageId = await ctx.db.insert("pages", {
      userId,
      workspaceId: active._id,
      parentId: args.parentId as Id<"pages"> | null,
      title: args.title ?? "",
      titleKey: titleKeyFor(args.title ?? ""),
      icon: args.icon ?? "lucide:FileText",
      cover: null,
      ...newPageBlockFields(blocks),
      favorite: false,
      trashed: false,
      isPublic: false,
      rowOfDatabaseId: args.rowOfDatabaseId as Id<"databases"> | undefined,
      rowProps: args.rowOfDatabaseId ? {} : undefined,
      searchText: buildSearchText(args.title, blocks),
      createdAt: now,
      updatedAt: now,
    });
    await insertPageBlocks(ctx, pageId, blocks);
    // Fire-and-forget webhook fan-out — no await blocks the caller.
    // `as any` on internal.webhooks.deliver: convex codegen FilterApi for
    // the `internal` surface drops internalAction refs in some module shapes
    // (see webhooks/deliver.ts — query+mutation+action mixed module),
    // leaving only `listEnabledForOwner` + `recordDelivery` visible to tsc
    // even though the runtime ref resolves correctly. Tracked for codegen
    // bug report; cast keeps `pnpm typecheck` green.
    await ctx.scheduler.runAfter(0, (internal.webhooks.deliver as any).run, {
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
    const hasBlocks = "blocks" in args.patch;
    const nextTitle = args.patch.title ?? page.title;
    const touchesContent = "title" in args.patch || hasBlocks;
    // Current blocks: the incoming patch when it edits them, else the stored
    // pageBlocks (needed to rebuild searchText on a title-only edit).
    const nextBlocks = hasBlocks
      ? (args.patch.blocks as unknown[])
      : await readPageBlocks(ctx, page);
    if (hasBlocks) {
      // Block edit → split writer (writes pageBlocks + denorm, empties doc).
      const rest: Record<string, unknown> = { ...args.patch };
      delete rest.blocks;
      await writePageBlocks(ctx, args.pageId as Id<"pages">, nextBlocks, {
        ...rest,
        searchText: buildSearchText(nextTitle, nextBlocks),
      });
    } else {
      await ctx.db.patch(args.pageId as Id<"pages">, {
        ...args.patch,
        ...(touchesContent ? { searchText: buildSearchText(nextTitle, nextBlocks) } : {}),
        updatedAt: Date.now(),
      });
    }
    if (touchesContent) {
      // Rebuild graph edges + titleKey next to searchText.
      const fresh = await ctx.db.get(args.pageId as Id<"pages">);
      if (fresh) await reindexPageLinks(ctx, fresh, nextBlocks);
      await ctx.scheduler.runAfter(0, (internal.webhooks.deliver as any).run, {
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
    const ids = await collectDescendantIds(ctx, args.pageId, userId, page.workspaceId);
    const now = Date.now();
    for (const id of ids) {
      await ctx.db.patch(id as Id<"pages">, { trashed: true, updatedAt: now });
    }
    await ctx.scheduler.runAfter(0, (internal.webhooks.deliver as any).run, {
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
    const ids = await collectDescendantIds(ctx, args.pageId, userId, page.workspaceId);
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
    const ids = await collectDescendantIds(ctx, args.pageId, userId, page.workspaceId);
    for (const id of ids) {
      // Snapshot cleanup is best-effort — only the viewer's own snapshots get
      // deleted (snapshots are author-owned, no by_workspace index yet).
      // Other members' snapshots become orphaned; session-2 snapshot scoping
      // will fix the leak.
      // Snapshot count is bounded server-side to COUNT_CAPS.snapshotsPerPage (50);
      // take(100) leaves slack for legacy rows that pre-dated the cap.
      const snaps = await ctx.db.query("snapshots").withIndex("by_user_page", (q) => q.eq("userId", userId).eq("pageId", id as Id<"pages">)).take(100);
      for (const s of snaps) await ctx.db.delete(s._id);
      await deletePageBlocks(ctx, id as Id<"pages">);
      await ctx.db.delete(id as Id<"pages">);
    }
    await ctx.scheduler.runAfter(0, (internal.webhooks.deliver as any).run, {
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
    await rateLimit(ctx, userId, RATE_LIMITS.pagesDuplicateDay);
    const now = Date.now();
    const srcBlocks = await readPageBlocks(ctx, src);
    const cloned = structuredClone(srcBlocks) as BlockLike[];
    const blocks = regenAllBlockIds(cloned);
    const title = src.title ? `${src.title} (copy)` : "";
    const active = await getActiveWorkspaceMutation(ctx, userId);
    const newPageId = await ctx.db.insert("pages", {
      userId,
      workspaceId: src.workspaceId ?? active._id,
      parentId: src.parentId,
      title,
      titleKey: titleKeyFor(title),
      icon: src.icon,
      cover: src.cover,
      ...newPageBlockFields(blocks),
      favorite: false,
      trashed: false,
      isPublic: src.isPublic,
      rowOfDatabaseId: src.rowOfDatabaseId,
      rowProps: src.rowProps ? structuredClone(src.rowProps) : undefined,
      searchText: buildSearchText(title, blocks),
      createdAt: now,
      updatedAt: now,
    });
    await insertPageBlocks(ctx, newPageId, blocks);
    // Cloned blocks may carry [[wikilinks]] / #tags / mentions — index them.
    const fresh = await ctx.db.get(newPageId);
    if (fresh) await reindexPageLinks(ctx, fresh, blocks);
    return newPageId;
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
    const { doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const curBlocks = await readPageBlocks(ctx, page);
    const { blocks, newId } = addBlockToArray(
      curBlocks as BlockOpLike[], args.afterIndex, args.type, args.init, uid,
    );
    await writePageBlocks(ctx, args.pageId as Id<"pages">, blocks, {
      searchText: buildSearchText(page.title, blocks),
    });
    const fresh = await ctx.db.get(args.pageId as Id<"pages">);
    if (fresh) await reindexPageLinks(ctx, fresh, blocks);
    return newId;
  },
});

/** Append markdown content to the end of a page. Parsed server-side
 *  via `_shared/markdown.markdownToBlocks` so the AI agent can emit a
 *  single mutation instead of N add-block round-trips. Honors the
 *  per-page block cap. */
export const appendMarkdown = mutation({
  args: { pageId: v.id("pages"), markdown: v.string() },
  handler: async (ctx, args) => {
    const { doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const parsed = markdownToBlocks(args.markdown);
    const cur = (await readPageBlocks(ctx, page)) as Array<{ id: string; type?: string; text?: string }>;
    // Drop the trailing empty paragraph stub that newly-created pages
    // ship with, so the appended content doesn't render with an empty
    // gap above it.
    const trimmed = cur.length === 1 && cur[0].type === "paragraph" && cur[0].text === ""
      ? []
      : cur;
    const blocks = [...trimmed, ...parsed];
    if (blocks.length > COUNT_CAPS.blocksPerPage) {
      throw new Error(`Page would exceed block cap (${COUNT_CAPS.blocksPerPage})`);
    }
    await writePageBlocks(ctx, args.pageId as Id<"pages">, blocks, {
      searchText: buildSearchText(page.title, blocks),
    });
    const fresh = await ctx.db.get(args.pageId as Id<"pages">);
    if (fresh) await reindexPageLinks(ctx, fresh, blocks);
    return parsed.length;
  },
});

/** Server-side replace a single block by id. Authoritative blocks
 *  array → no client cache reliance (the slim listMeta projection
 *  omits blocks, so a client-side splice would wipe the page). */
export const replaceBlockById = mutation({
  args: {
    pageId: v.id("pages"),
    blockId: v.string(),
    nextBlock: v.any(),
  },
  handler: async (ctx, args) => {
    const { doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const curBlocks = await readPageBlocks(ctx, page);
    const blocks = replaceBlockInArray(curBlocks as BlockOpLike[], args.blockId, args.nextBlock);
    if (!blocks) throw new Error("Block not found");
    await writePageBlocks(ctx, args.pageId as Id<"pages">, blocks, {
      searchText: buildSearchText(page.title, blocks),
    });
    const fresh = await ctx.db.get(args.pageId as Id<"pages">);
    if (fresh) await reindexPageLinks(ctx, fresh, blocks);
  },
});

/** Server-side duplicate. Inserts a clone of the block (new id)
 *  immediately after. Returns the new block id. */
export const duplicateBlockById = mutation({
  args: { pageId: v.id("pages"), blockId: v.string() },
  handler: async (ctx, args) => {
    const { doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const curBlocks = await readPageBlocks(ctx, page);
    const dup = duplicateBlockInArray(curBlocks as BlockOpLike[], args.blockId, uid);
    if (!dup) throw new Error("Block not found");
    if (dup.blocks.length > COUNT_CAPS.blocksPerPage) throw new Error(`Page exceeds block cap (${COUNT_CAPS.blocksPerPage})`);
    await writePageBlocks(ctx, args.pageId as Id<"pages">, dup.blocks, {
      searchText: buildSearchText(page.title, dup.blocks),
    });
    const fresh = await ctx.db.get(args.pageId as Id<"pages">);
    if (fresh) await reindexPageLinks(ctx, fresh, dup.blocks);
    return dup.newId;
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
    const curBlocks = await readPageBlocks(ctx, page);
    const blocks = insertBlocksAfterAnchor(
      curBlocks as BlockOpLike[], args.anchorBlockId, args.blocks as BlockOpLike[], !!args.replaceAnchor,
    );
    if (!blocks) throw new Error("Anchor block not found");
    if (blocks.length > COUNT_CAPS.blocksPerPage) throw new Error(`Page exceeds block cap (${COUNT_CAPS.blocksPerPage})`);
    await writePageBlocks(ctx, args.pageId as Id<"pages">, blocks, {
      searchText: buildSearchText(page.title, blocks),
    });
    const fresh = await ctx.db.get(args.pageId as Id<"pages">);
    if (fresh) await reindexPageLinks(ctx, fresh, blocks);
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
    const { doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const curBlocks = await readPageBlocks(ctx, page);
    const blocks = updateBlockInArray(curBlocks as BlockOpLike[], args.blockId, args.patch);
    // Only rebuild searchText when the patch touches text-bearing fields.
    // Toggle/reorder/style-only patches skip the O(blocks) string build.
    const TEXT_FIELDS = ["text", "type", "lang", "caption"];
    const touchesText = Object.keys(args.patch ?? {}).some((k) => TEXT_FIELDS.includes(k));
    await writePageBlocks(ctx, args.pageId as Id<"pages">, blocks,
      touchesText ? { searchText: buildSearchText(page.title, blocks) } : {},
    );
    if (touchesText) {
      const fresh = await ctx.db.get(args.pageId as Id<"pages">);
      if (fresh) await reindexPageLinks(ctx, fresh, blocks);
    }
  },
});

/** Remove block by id. If the page would become empty, seeds one
 *  paragraph so cursor always has somewhere to land. Rebuilds
 *  `searchText`. */
export const deleteBlock = mutation({
  args: { pageId: v.id("pages"), blockId: v.string() },
  handler: async (ctx, args) => {
    const { doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const curBlocks = await readPageBlocks(ctx, page);
    const blocks = deleteBlockFromArray(curBlocks as BlockOpLike[], args.blockId, uid);
    await writePageBlocks(ctx, args.pageId as Id<"pages">, blocks, {
      searchText: buildSearchText(page.title, blocks),
    });
    const fresh = await ctx.db.get(args.pageId as Id<"pages">);
    if (fresh) await reindexPageLinks(ctx, fresh, blocks);
  },
});

/** Shuffle `page.blocks` to match `orderedIds`. Blocks not in the list
 *  are dropped silently. Used by dnd-kit drop handler. Does NOT
 *  rebuild `searchText` — reorder preserves the word set. */
export const reorderBlocks = mutation({
  args: { pageId: v.id("pages"), orderedIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const { doc: page } = await requireWorkspaceAccess(ctx, "pages", args.pageId as Id<"pages">, { write: true });
    const curBlocks = await readPageBlocks(ctx, page);
    const blocks = reorderBlocksInArray(curBlocks as BlockOpLike[], args.orderedIds);
    // searchText unchanged — reorder doesn't change the set of words. But
    // previewText CAN change (first text block moved) → writePageBlocks
    // recomputes the denorm columns.
    await writePageBlocks(ctx, args.pageId as Id<"pages">, blocks, {});
  },
});
