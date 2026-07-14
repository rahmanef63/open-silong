/** One-shot backfill for the memory-graph edge index.
 *
 *  Paginates every page and runs `reindexPageLinks` (idempotent:
 *  delete-by-source then reinsert), populating `pageLinks` +
 *  `pages.tags` + `pages.titleKey` for rows that pre-date the write-time
 *  reindex hooks. Trashed pages are skipped (their edges are not indexed).
 *
 *  Batched so a large workspace never exceeds a single mutation's op
 *  budget — call in a loop, feeding back `continueCursor` until
 *  `isDone`:
 *
 *    pnpm exec convex run features/graph/migrations:backfillLinks '{}'
 *    pnpm exec convex run features/graph/migrations:backfillLinks '{"cursor":"<continueCursor>"}'
 *
 *  Cross-page `[[Title]]` wikilinks resolve to an id only once the target
 *  page's `titleKey` exists, so a page linked before its target was
 *  processed stays a ghost on the first sweep. A SECOND full run resolves
 *  all such references (idempotent) — run twice for a clean graph.
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { reindexPageLinks } from "../../_shared/links";
import { readPageBlocks } from "../../_shared/pageContent";

const DEFAULT_BATCH = 100;
const MAX_BATCH = 200;

export const backfillLinks = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, batchSize }) => {
    const numItems = Math.max(1, Math.min(MAX_BATCH, batchSize ?? DEFAULT_BATCH));
    const result = await ctx.db.query("pages").paginate({
      cursor: cursor ?? null,
      numItems,
    });

    let processed = 0;
    let skipped = 0;
    for (const page of result.page) {
      if (page.trashed) {
        skipped++;
        continue;
      }
      await reindexPageLinks(ctx, page, await readPageBlocks(ctx, page));
      processed++;
    }

    return {
      processed,
      skipped,
      scanned: result.page.length,
      isDone: result.isDone,
      continueCursor: result.isDone ? null : result.continueCursor,
    };
  },
});
