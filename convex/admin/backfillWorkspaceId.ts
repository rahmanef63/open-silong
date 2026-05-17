/** One-shot backfill — stamps `workspaceId` on legacy pages + databases
 *  that have no `workspaceId` set. Necessary because the template
 *  instantiator USED TO insert without stamping workspaceId, leaving
 *  rows visible only via the legacy fallback (personal workspace only)
 *  and invisible to non-personal active workspaces — which manifested
 *  as DatabaseSkeleton never resolving for embedded DB blocks.
 *
 *  Strategy: per unstamped row, find the row owner's PERSONAL workspace
 *  (the bucket where the legacy fallback was placing them) and stamp
 *  with that workspaceId. Rows whose owner has no personal workspace
 *  are skipped (they were already orphaned).
 *
 *  Trigger:
 *    pnpm exec convex run admin/backfillWorkspaceId:run --self-hosted
 *
 *  Idempotent — only touches rows with `workspaceId === undefined`.
 *  Full-table scan; take(50000) cap matches the pattern in
 *  backfillHasPublicForm.ts. */

import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const personalByUser = new Map<string, Id<"workspaces">>();

    async function personalFor(userId: Id<"users">): Promise<Id<"workspaces"> | null> {
      const cached = personalByUser.get(String(userId));
      if (cached) return cached;
      const all = await ctx.db
        .query("workspaces")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const personal = all.find((w) => w.isPersonal) ?? all[0];
      if (personal) personalByUser.set(String(userId), personal._id);
      return personal?._id ?? null;
    }

    const pages = await ctx.db.query("pages").take(50000);
    let pagesPatched = 0;
    let pagesSkipped = 0;
    for (const p of pages) {
      if (p.workspaceId) continue;
      const ws = await personalFor(p.userId);
      if (!ws) { pagesSkipped++; continue; }
      await ctx.db.patch(p._id, { workspaceId: ws });
      pagesPatched++;
    }

    const databases = await ctx.db.query("databases").take(50000);
    let dbsPatched = 0;
    let dbsSkipped = 0;
    for (const d of databases) {
      if (d.workspaceId) continue;
      const ws = await personalFor(d.userId);
      if (!ws) { dbsSkipped++; continue; }
      await ctx.db.patch(d._id, { workspaceId: ws });
      dbsPatched++;
    }

    return {
      pages: { scanned: pages.length, patched: pagesPatched, skipped: pagesSkipped },
      databases: { scanned: databases.length, patched: dbsPatched, skipped: dbsSkipped },
    };
  },
});
