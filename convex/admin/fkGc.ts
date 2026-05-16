/** FK garbage-collector. Removes invalid / wrong-table id references
 *  so the schema can be tightened from `v.string()` → `v.id(TABLE)`.
 *
 *  Cleanup rules (drop-only, never resurrect):
 *
 *    - `recents.pageIds[]` — strip ids that don't resolve as `Id<"pages">`.
 *      Touches the row even if it becomes empty (kept; reads handle empty).
 *    - `snapshots.pageId` — delete the snapshot if its pageId no longer
 *      resolves as `Id<"pages">`. Snapshots are append-only history;
 *      losing an orphan is harmless.
 *    - `pages.rowOfDatabaseId` — unset the field if the referenced
 *      database is gone. Page reverts to a free-standing page.
 *    - `pages.databaseHostFor[]` — strip entries that don't resolve.
 *    - `pages.parentId` — null it if the parent no longer exists.
 *    - `comments.pageId` — delete comment if page gone.
 *    - `notifications.pageId` — clear field (notification stays).
 *    - `databases.rowIds[]` — strip non-`Id<"pages">` entries.
 *
 *  Uses `db.normalizeId(table, value)` which returns the branded id when
 *  the value is a syntactically-valid id for that exact table, else null.
 *  This catches BOTH wrong-table refs and outright bad strings — the
 *  audit query `db.get(...)` returns null for both nonexistent AND
 *  wrong-table ids without throwing, so the audit's orphan bucket
 *  hides both classes.
 *
 *  Run before tightening:
 *    pnpm exec convex run admin/fkGc:run
 */

import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

const SCAN_CAP = 10_000;

export const run = internalMutation({
  args: {},
  handler: async (ctx): Promise<{
    recents: { scanned: number; stripped: number };
    snapshots: { scanned: number; deleted: number };
    pages: { scanned: number; rowOfDbCleared: number; hostStripped: number; parentNulled: number };
    comments: { scanned: number; deleted: number };
    notifications: { scanned: number; cleared: number };
    databases: { scanned: number; rowsStripped: number };
  }> => {
    const out = {
      recents: { scanned: 0, stripped: 0 },
      snapshots: { scanned: 0, deleted: 0 },
      pages: { scanned: 0, rowOfDbCleared: 0, hostStripped: 0, parentNulled: 0 },
      comments: { scanned: 0, deleted: 0 },
      notifications: { scanned: 0, cleared: 0 },
      databases: { scanned: 0, rowsStripped: 0 },
    };

    // recents
    {
      const rows = await ctx.db.query("recents").take(SCAN_CAP);
      for (const r of rows) {
        out.recents.scanned += 1;
        const filtered: Id<"pages">[] = [];
        let touched = false;
        for (const pid of r.pageIds ?? []) {
          const norm = ctx.db.normalizeId("pages", pid as string);
          if (norm) filtered.push(norm);
          else { touched = true; out.recents.stripped += 1; }
        }
        if (touched) await ctx.db.patch(r._id, { pageIds: filtered });
      }
    }

    // snapshots — drop the row entirely if pageId doesn't resolve
    {
      const rows = await ctx.db.query("snapshots").take(SCAN_CAP);
      for (const s of rows) {
        out.snapshots.scanned += 1;
        const norm = ctx.db.normalizeId("pages", s.pageId as unknown as string);
        if (!norm) {
          await ctx.db.delete(s._id);
          out.snapshots.deleted += 1;
        }
      }
    }

    // pages — rowOfDatabaseId / databaseHostFor / parentId
    {
      const rows = await ctx.db.query("pages").take(SCAN_CAP);
      for (const p of rows) {
        out.pages.scanned += 1;
        const patch: Record<string, unknown> = {};
        if (p.rowOfDatabaseId) {
          const norm = ctx.db.normalizeId("databases", p.rowOfDatabaseId as unknown as string);
          if (!norm) { patch.rowOfDatabaseId = undefined; out.pages.rowOfDbCleared += 1; }
        }
        if (Array.isArray(p.databaseHostFor)) {
          const filtered: Id<"databases">[] = [];
          let touched = false;
          for (const dbId of p.databaseHostFor) {
            const norm = ctx.db.normalizeId("databases", dbId as unknown as string);
            if (norm) filtered.push(norm);
            else { touched = true; out.pages.hostStripped += 1; }
          }
          if (touched) patch.databaseHostFor = filtered;
        }
        if (p.parentId) {
          const norm = ctx.db.normalizeId("pages", p.parentId as unknown as string);
          if (!norm) { patch.parentId = null; out.pages.parentNulled += 1; }
        }
        if (Object.keys(patch).length > 0) await ctx.db.patch(p._id, patch);
      }
    }

    // comments
    {
      const rows = await ctx.db.query("comments").take(SCAN_CAP);
      for (const c of rows) {
        out.comments.scanned += 1;
        const norm = ctx.db.normalizeId("pages", c.pageId as unknown as string);
        if (!norm) { await ctx.db.delete(c._id); out.comments.deleted += 1; }
      }
    }

    // notifications
    {
      const rows = await ctx.db.query("notifications").take(SCAN_CAP);
      for (const n of rows) {
        out.notifications.scanned += 1;
        if (!n.pageId) continue;
        const norm = ctx.db.normalizeId("pages", n.pageId as unknown as string);
        if (!norm) { await ctx.db.patch(n._id, { pageId: undefined }); out.notifications.cleared += 1; }
      }
    }

    // databases.rowIds[]
    {
      const rows = await ctx.db.query("databases").take(SCAN_CAP);
      for (const d of rows) {
        out.databases.scanned += 1;
        const filtered: Id<"pages">[] = [];
        let touched = false;
        for (const rid of d.rowIds ?? []) {
          const norm = ctx.db.normalizeId("pages", rid as unknown as string);
          if (norm) filtered.push(norm);
          else { touched = true; out.databases.rowsStripped += 1; }
        }
        if (touched) await ctx.db.patch(d._id, { rowIds: filtered });
      }
    }

    return out;
  },
});
