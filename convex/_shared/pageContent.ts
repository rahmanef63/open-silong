/** Page-content split helpers (2026-07-14).
 *
 *  Heavy `blocks` live in the `pageBlocks` table (one row per page), NOT on
 *  the `pages` doc — so the workspace-wide `listMeta` sidebar subscription
 *  re-reads only small metadata docs on every edit. `searchText` STAYS on
 *  `pages` (its search index lives there).
 *
 *  Safety: reads fall back to the legacy `pages.blocks` field for rows not yet
 *  backfilled, and the backfill copies into `pageBlocks` BEFORE emptying
 *  `pages.blocks` — so content is never unreachable, even mid-migration.
 *
 *  Every block WRITE goes through `writePageBlocks`; every block READ goes
 *  through `readPageBlocks` / `pageMetaOf`. Do not read `page.blocks` directly.
 */

import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { buildSearchText } from "../features/search/lib";

type AnyBlock = { type?: string; text?: string; databaseId?: string; [k: string]: unknown };

/** Denormalized page-meta columns derived from a blocks array. */
export function derivePageMeta(blocks: unknown): {
  blockCount: number;
  previewText: string;
  databaseHostFor: Id<"databases">[];
} {
  const arr = (Array.isArray(blocks) ? blocks : []) as AnyBlock[];
  let previewText = "";
  for (const b of arr) {
    if (typeof b?.text === "string" && b.text.trim()) { previewText = b.text.slice(0, 120); break; }
  }
  const databaseHostFor = arr
    .filter((b) => b?.type === "database" && b?.databaseId)
    .map((b) => b.databaseId as unknown as Id<"databases">);
  return { blockCount: arr.length, previewText, databaseHostFor };
}

/** Read the denorm meta for a list row — prefers the stored columns, falls
 *  back to deriving from the legacy `blocks` for un-backfilled rows. Pure. */
export function pageMetaOf(doc: Doc<"pages">): {
  blockCount: number;
  previewText: string;
  databaseHostFor: Id<"databases">[];
} {
  const hasDenorm = doc.blockCount !== undefined || doc.previewText !== undefined;
  if (hasDenorm) {
    return {
      blockCount: doc.blockCount ?? 0,
      previewText: doc.previewText ?? "",
      databaseHostFor: (doc.databaseHostFor ?? []) as Id<"databases">[],
    };
  }
  return derivePageMeta(doc.blocks);
}

/** Read a page's blocks from `pageBlocks`, falling back to the legacy
 *  `pages.blocks` field for rows not yet backfilled. Never throws. */
export async function readPageBlocks(ctx: QueryCtx | MutationCtx, page: Doc<"pages">): Promise<unknown[]> {
  const row = await ctx.db
    .query("pageBlocks")
    .withIndex("by_page", (q) => q.eq("pageId", page._id))
    .unique();
  if (row) return row.blocks;
  return (page.blocks as unknown[]) ?? [];
}

/** As `readPageBlocks` but from an id (fetches the page for the fallback). */
export async function readPageBlocksById(
  ctx: QueryCtx | MutationCtx,
  pageId: Id<"pages">,
): Promise<unknown[]> {
  const row = await ctx.db
    .query("pageBlocks")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  if (row) return row.blocks;
  const page = await ctx.db.get(pageId);
  return ((page?.blocks as unknown[]) ?? []);
}

/** Persist a page's blocks: upsert the `pageBlocks` row, refresh the
 *  denorm columns, EMPTY the legacy `pages.blocks` (kept small), and merge
 *  any extra page fields from `patch` (title/cover/layouts/searchText/…).
 *
 *  Derived meta (blocks:[], blockCount, previewText, databaseHostFor) always
 *  wins over `patch`; `updatedAt` defaults to now unless `patch` sets it.
 *  `patch.searchText` is the caller's responsibility — pass it (built via
 *  `buildSearchText`) on content edits, omit on reorder/style-only edits. */
export async function writePageBlocks(
  ctx: MutationCtx,
  pageId: Id<"pages">,
  blocks: unknown[],
  patch: Record<string, unknown> = {},
): Promise<void> {
  const existing = await ctx.db
    .query("pageBlocks")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  if (existing) await ctx.db.patch(existing._id, { blocks });
  else await ctx.db.insert("pageBlocks", { pageId, blocks });

  const meta = derivePageMeta(blocks);
  await ctx.db.patch(pageId, {
    updatedAt: Date.now(),
    ...patch,
    blocks: [],
    blockCount: meta.blockCount,
    previewText: meta.previewText,
    databaseHostFor: meta.databaseHostFor,
  });
}

/** Fields to spread into an `insert("pages", …)` so a freshly-created page
 *  keeps `blocks` empty on the doc + carries fresh denorm columns. Pair with
 *  `insertPageBlocks(ctx, pageId, blocks)` AFTER the insert. */
export function newPageBlockFields(blocks: unknown[]): {
  blocks: never[];
  blockCount: number;
  previewText: string;
  databaseHostFor: Id<"databases">[];
} {
  const meta = derivePageMeta(blocks);
  return { blocks: [], blockCount: meta.blockCount, previewText: meta.previewText, databaseHostFor: meta.databaseHostFor };
}

/** Create the `pageBlocks` row for a just-inserted page. */
export async function insertPageBlocks(ctx: MutationCtx, pageId: Id<"pages">, blocks: unknown[]): Promise<void> {
  await ctx.db.insert("pageBlocks", { pageId, blocks });
}

/** Delete a page's `pageBlocks` row (call when permanently deleting a page). */
export async function deletePageBlocks(ctx: MutationCtx, pageId: Id<"pages">): Promise<void> {
  const row = await ctx.db
    .query("pageBlocks")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  if (row) await ctx.db.delete(row._id);
}

/** Re-export so write sites build searchText from one import. */
export { buildSearchText };
