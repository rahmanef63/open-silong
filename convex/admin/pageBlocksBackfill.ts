/** One-shot backfill for the pages→pageBlocks content split (2026-07-14).
 *
 *  For every page WITHOUT a `pageBlocks` row: copy `pages.blocks` into a new
 *  `pageBlocks` row, stamp the denorm columns (blockCount/previewText/
 *  databaseHostFor), THEN empty `pages.blocks`. Copy-before-empty ⇒ content is
 *  never destroyed; reads fall back to `pages.blocks` for any row not yet
 *  reached. Idempotent (skips pages that already have a pageBlocks row), so it
 *  is safe to re-run.
 *
 *  Run: `pnpm exec convex run admin/pageBlocksBackfill:run` (dev) or with
 *  `env -u CONVEX_DEPLOYMENT … --prod` for production.
 */

import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { derivePageMeta } from "../_shared/pageContent";

const BATCH = 100;

export const backfillBatch = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const res = await ctx.db
      .query("pages")
      .paginate({ cursor: cursor ?? null, numItems: BATCH });

    let migrated = 0;
    let skipped = 0;
    for (const p of res.page) {
      const existing = await ctx.db
        .query("pageBlocks")
        .withIndex("by_page", (q) => q.eq("pageId", p._id))
        .unique();
      if (existing) { skipped++; continue; }
      const blocks = (p.blocks as unknown[]) ?? [];
      await ctx.db.insert("pageBlocks", { pageId: p._id, blocks });
      const meta = derivePageMeta(blocks);
      await ctx.db.patch(p._id, {
        blocks: [],
        blockCount: meta.blockCount,
        previewText: meta.previewText,
        databaseHostFor: meta.databaseHostFor,
      });
      migrated++;
    }
    return { migrated, skipped, isDone: res.isDone, cursor: res.continueCursor };
  },
});

export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<{ migrated: number; skipped: number; batches: number }> => {
    let cursor: string | undefined = undefined;
    let migrated = 0;
    let skipped = 0;
    let batches = 0;
    // Loop batches until the paginator reports done. Bounded by the 1000-batch
    // guard so a bug can't spin forever.
    for (let i = 0; i < 1000; i++) {
      const r: { migrated: number; skipped: number; isDone: boolean; cursor: string } =
        await ctx.runMutation(internal.admin.pageBlocksBackfill.backfillBatch, { cursor });
      migrated += r.migrated;
      skipped += r.skipped;
      batches++;
      if (r.isDone) break;
      cursor = r.cursor;
    }
    return { migrated, skipped, batches };
  },
});
