/** Public graph mutations for the memory-graph feature.
 *
 *  The steady-state edge index is maintained by `reindexPageLinks` fired
 *  on every page write (beside `buildSearchText`). This module exposes a
 *  manual re-index escape hatch for a "rebuild links" UI action or to
 *  repair drift on a single page. Idempotent (delete-by-source then
 *  reinsert). Authz + write-role gate inside the handler (CLAUDE.md P0).
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requireWorkspaceAccess } from "../../_shared/auth";
import { reindexPageLinks } from "../../_shared/links";

/** Force-reindex a single page's outgoing links + denormalized tags.
 *  Requires write access (owner|editor) to the page's workspace. */
export const reindexPage = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const { doc } = await requireWorkspaceAccess(ctx, "pages", pageId, {
      write: true,
    });
    // Re-fetch so the reindex sees the freshest blocks/title/workspaceId.
    const fresh = await ctx.db.get(doc._id);
    if (!fresh) return { ok: false as const };
    await reindexPageLinks(ctx, fresh);
    return { ok: true as const };
  },
});
