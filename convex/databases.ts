import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAuth, requireWorkspaceAccess } from "./_shared/auth";
import { rateLimit } from "./_shared/rateLimit";
import { RATE_LIMITS } from "./_shared/limits";
import { Id } from "./_generated/dataModel";
import {
  getActiveWorkspaceMutation,
  readActiveWorkspace,
  databasesInActiveWorkspace,
  requireActiveWorkspaceWritable,
} from "./_shared/workspace";
import { uid } from "./_shared/uid";

/** Owner-only full list. Includes `properties[]`, `views[]`,
 *  `rowIds[]`, `templates[]`. Acceptable to ship in full because
 *  databases are typically O(10s) per workspace. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return [];
    return await databasesInActiveWorkspace(ctx, userId, active);
  },
});

/** Soft-delete database. Does NOT cascade to row pages — they remain
 *  reachable by direct id (e.g. backlinks). Use `permanentlyDelete`
 *  to cascade. */
export const trash = mutation({
  args: { dbId: v.id("databases") },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, "databases", args.dbId as Id<"databases">, { write: true });
    await ctx.db.patch(args.dbId as Id<"databases">, { trashed: true, updatedAt: Date.now() });
  },
});

/** Inverse of `trash`. Un-flips `trashed`. Row pages were not
 *  touched by `trash`, so no cascade needed here either. */
export const restore = mutation({
  args: { dbId: v.id("databases") },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, "databases", args.dbId as Id<"databases">, { write: true });
    await ctx.db.patch(args.dbId as Id<"databases">, { trashed: false, updatedAt: Date.now() });
  },
});

/** Cascade delete: every row page owned by the same user, then the
 *  database doc. Snapshots referencing those row pages are NOT cleaned
 *  up here — `pages.permanentlyDelete` is the surface that walks
 *  `snapshots.by_user_page`. Today's row pages don't typically have
 *  snapshots so leak risk is low. */
export const permanentlyDelete = mutation({
  args: { dbId: v.id("databases") },
  handler: async (ctx, args) => {
    const { doc: db } = await requireWorkspaceAccess(ctx, "databases", args.dbId as Id<"databases">, { write: true });
    const rows = await Promise.all(
      db.rowIds.map((rowId) => ctx.db.get(rowId as Id<"pages">)),
    );
    await Promise.all(
      rows
        .filter((r): r is NonNullable<typeof r> => !!r && (
          // Same workspace as the database, or legacy unstamped owned by db owner.
          (r.workspaceId && r.workspaceId === db.workspaceId) ||
          (!r.workspaceId && !db.workspaceId && r.userId === db.userId)
        ))
        .map((r) => ctx.db.delete(r._id)),
    );
    await ctx.db.delete(args.dbId as Id<"databases">);
  },
});

/** Insert a new database. Seeds Title (text) + Status (select with 3
 *  options) + one Table view as the active view. Returns the bare
 *  `Id<"databases">`. */
export const create = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await rateLimit(ctx, userId, RATE_LIMITS.dbCreate);
    await rateLimit(ctx, userId, RATE_LIMITS.dbCreateDay);
    const active = await requireActiveWorkspaceWritable(ctx, userId);
    const now = Date.now();
    const titleProp = { id: uid(), name: "Name", type: "text" };
    const statusProp = {
      id: uid(), name: "Status", type: "status",
      options: [
        { id: uid(), name: "Not started", color: "gray" },
        { id: uid(), name: "In progress", color: "blue" },
        { id: uid(), name: "Done", color: "green" },
      ],
    };
    const view = { id: uid(), name: "Table", type: "table", sorts: [], filters: [], search: "" };
    const dbId = await ctx.db.insert("databases", {
      userId,
      workspaceId: active._id,
      name: args.name ?? "Untitled database",
      icon: "lucide:Database",
      properties: [titleProp, statusProp],
      rowIds: [],
      views: [view],
      activeViewId: view.id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.webhooks.deliver.run, {
      ownerId: userId,
      event: "db.created",
      payload: { dbId, name: args.name ?? "Untitled database" },
    });
    return dbId;
  },
});

/** Firehose patch — accepts any partial of the database doc. Frontend
 *  drives schema (properties / views / rowIds / templates) through
 *  this single mutation rather than 50+ thin ones. Server-side trust
 *  is full; client-side guard lives in
 *  `frontend/shared/lib/store/mutationGuard.ts`. See
 *  `docs/api/databases.md` for the patch shape table. */
export const update = mutation({
  args: { dbId: v.id("databases"), patch: v.any() },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, "databases", args.dbId as Id<"databases">, { write: true });
    const patch: Record<string, unknown> = { ...args.patch, updatedAt: Date.now() };
    // Recompute hasPublicForm whenever views[] changes so the by_has_public_form
    // index stays in sync — public form lookup (`convex/forms/public.ts`)
    // depends on this flag to skip a full-table scan.
    if (Array.isArray(args.patch?.views)) {
      patch.hasPublicForm = (args.patch.views as Array<{ formIsPublic?: boolean }>).some(
        (v) => v.formIsPublic === true,
      );
    }
    await ctx.db.patch(args.dbId as Id<"databases">, patch);
  },
});

/** Insert a new row page (page with `rowOfDatabaseId: dbId`). Merges
 *  `templateId` body+rowProps with `init.rowProps`. Auto-bumps every
 *  `unique_id` property's counter and seeds the row with the next id
 *  (prefix-aware). Appends to `database.rowIds`. Returns row's
 *  `Id<"pages">`. */
export const addRow = mutation({
  args: { dbId: v.id("databases"), init: v.optional(v.any()), templateId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId, doc: db } = await requireWorkspaceAccess(ctx, "databases", args.dbId as Id<"databases">, { write: true });
    await rateLimit(ctx, userId, RATE_LIMITS.dbAddRow);
    await rateLimit(ctx, userId, RATE_LIMITS.dbAddRowDay);
    const now = Date.now();

    const uniqueIdProps: { id: string; prefix?: string }[] = (db.properties ?? [])
      .filter((p: any) => p.type === "unique_id")
      .map((p: any) => ({ id: p.id, prefix: p.uniqueIdPrefix }));
    let counter = db.uniqueIdCounter ?? 0;

    const templates = (db as any).templates as any[] | undefined;
    const tplId = args.templateId ?? db.defaultTemplateId ?? null;
    const tpl = tplId ? templates?.find((t) => t.id === tplId) : undefined;

    const seedRowProps: Record<string, any> = {
      ...((tpl?.rowProps as any) ?? {}),
      ...(((args.init ?? {}).rowProps as any) ?? {}),
    };
    for (const u of uniqueIdProps) {
      counter += 1;
      seedRowProps[u.id] = u.prefix ? `${u.prefix}-${counter}` : String(counter);
    }

    const init = { ...(args.init ?? {}) };
    delete (init as any).rowProps;

    const seedBlocks = tpl?.blocks?.length
      ? tpl.blocks.map((b: any) => ({ ...b, id: uid() }))
      : [{ id: uid(), type: "paragraph", text: "" }];

    const rowId = await ctx.db.insert("pages", {
      userId,
      workspaceId: db.workspaceId ?? (await getActiveWorkspaceMutation(ctx, userId))._id,
      parentId: null,
      title: "",
      icon: tpl?.icon ?? "lucide:FileText",
      cover: null,
      blocks: seedBlocks,
      favorite: false,
      trashed: false,
      rowOfDatabaseId: args.dbId,
      rowProps: seedRowProps,
      createdAt: now,
      updatedAt: now,
      ...init,
    });
    await ctx.db.patch(args.dbId as Id<"databases">, {
      rowIds: [...db.rowIds, rowId],
      uniqueIdCounter: counter,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.webhooks.deliver.run, {
      ownerId: userId,
      event: "db.row.added",
      payload: { dbId: args.dbId, rowId, dbName: db.name },
    });
    return rowId;
  },
});

/** Deep-copy rows from `srcDbId` into `targetDbId`. Walks source row
 *  pages, clones each (with new id), and re-points `rowOfDatabaseId` at
 *  the target. Sub-item parent references are id-remapped in a second
 *  pass so children land beneath their cloned parent. Relation values
 *  pointing OUTSIDE the source db are preserved as-is; intra-db
 *  relations get remapped to the new row ids.
 *
 *  Bounded at 5000 rows per call — past that, suggest export/import. */
export const duplicateWithRows = mutation({
  args: { srcDbId: v.id("databases"), targetDbId: v.id("databases") },
  handler: async (ctx, args) => {
    const { userId, doc: src } = await requireWorkspaceAccess(ctx, "databases", args.srcDbId as Id<"databases">, { write: false });
    const { doc: target } = await requireWorkspaceAccess(ctx, "databases", args.targetDbId as Id<"databases">, { write: true });
    await rateLimit(ctx, userId, RATE_LIMITS.dbCreate);
    await rateLimit(ctx, userId, RATE_LIMITS.dbCreateDay);
    const MAX = 5000;
    const srcRowIds = (src.rowIds ?? []).slice(0, MAX) as string[];
    if (srcRowIds.length === 0) return { copied: 0 };
    const now = Date.now();

    // Build prop-id remap from source.properties → target.properties by
    // (name + type). When the duplicate-database action was used,
    // properties match by (name + type) since names are preserved.
    const propIdMap = new Map<string, string>();
    for (const sp of (src.properties ?? []) as { id: string; name: string; type: string }[]) {
      const tp = (target.properties ?? []).find(
        (p: any) => p.name === sp.name && p.type === sp.type,
      );
      if (tp) propIdMap.set(sp.id, tp.id);
    }

    const rowIdMap = new Map<string, string>();
    const insertedIds: Id<"pages">[] = [];

    // Phase 1: insert clones with rowProps but parent-ref values cleared
    // (we don't have new ids yet for intra-db relations).
    for (const oldId of srcRowIds) {
      const page = await ctx.db.get(oldId as Id<"pages">);
      if (!page) continue;
      const remappedRowProps: Record<string, unknown> = {};
      for (const [oldPropId, val] of Object.entries(page.rowProps ?? {})) {
        const newPropId = propIdMap.get(oldPropId);
        if (!newPropId) continue;
        remappedRowProps[newPropId] = val;
      }
      const newId = await ctx.db.insert("pages", {
        userId,
        workspaceId: target.workspaceId,
        parentId: null,
        title: page.title,
        icon: page.icon,
        cover: page.cover ?? null,
        blocks: JSON.parse(JSON.stringify(page.blocks ?? [])),
        favorite: false,
        trashed: false,
        rowOfDatabaseId: args.targetDbId,
        rowProps: remappedRowProps,
        createdAt: now,
        updatedAt: now,
      });
      rowIdMap.set(String(oldId), String(newId));
      insertedIds.push(newId);
    }

    // Phase 2: rewrite intra-db relation values now that we have the
    // full id map. Affects relation props whose target is the source db
    // (which is now this same target db post-clone).
    const relationProps = (target.properties ?? []).filter(
      (p: any) => p.type === "relation",
    ) as { id: string; relationDatabaseId?: string | null }[];
    for (const newId of insertedIds) {
      const page = await ctx.db.get(newId as Id<"pages">);
      if (!page) continue;
      let touched = false;
      const next: Record<string, unknown> = { ...(page.rowProps ?? {}) };
      for (const rp of relationProps) {
        const raw = next[rp.id];
        if (!Array.isArray(raw)) continue;
        const remapped = (raw as string[]).map((id) => rowIdMap.get(id) ?? id);
        const changed = remapped.some((id, i) => id !== (raw as string[])[i]);
        if (changed) {
          next[rp.id] = remapped;
          touched = true;
        }
      }
      if (touched) {
        await ctx.db.patch(newId as Id<"pages">, { rowProps: next });
      }
    }

    // Append to target.rowIds in source order.
    await ctx.db.patch(args.targetDbId as Id<"databases">, {
      rowIds: [...(target.rowIds ?? []), ...insertedIds],
      updatedAt: now,
    });
    return { copied: insertedIds.length };
  },
});

/** Soft-delete a row page (sets `pages.trashed: true`) and remove its
 *  id from `database.rowIds`. Recoverable from trash for 30 days. */
export const deleteRow = mutation({
  args: { dbId: v.id("databases"), rowPageId: v.id("pages") },
  handler: async (ctx, args) => {
    const { doc: db } = await requireWorkspaceAccess(ctx, "databases", args.dbId as Id<"databases">, { write: true });
    await requireWorkspaceAccess(ctx, "pages", args.rowPageId as Id<"pages">, { write: true });
    await ctx.db.patch(args.rowPageId as Id<"pages">, { trashed: true, updatedAt: Date.now() });
    await ctx.db.patch(args.dbId as Id<"databases">, {
      rowIds: db.rowIds.filter((r: string) => r !== args.rowPageId),
      updatedAt: Date.now(),
    });
  },
});

/** Patch a single property on a row. Auth gate is page ownership
 *  (the row's page IS the auth). `dbId` arg is currently unused
 *  server-side — kept for forward-compat with cross-row computed
 *  updates (relation propagation). Pass the parent dbId so callers
 *  don't have to change when that lands. */
export const setRowValue = mutation({
  args: { dbId: v.id("databases"), rowPageId: v.id("pages"), propId: v.string(), value: v.any() },
  handler: async (ctx, args) => {
    const { doc: page } = await requireWorkspaceAccess(ctx, "pages", args.rowPageId as Id<"pages">, { write: true });
    const rowProps = { ...(page.rowProps ?? {}), [args.propId]: args.value };
    await ctx.db.patch(args.rowPageId as Id<"pages">, { rowProps, updatedAt: Date.now() });
  },
});
