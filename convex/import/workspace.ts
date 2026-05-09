import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { requireAuth } from "../_shared/auth";
import { rateLimit } from "../_shared/rateLimit";
import { COUNT_CAPS, FILE_SIZES, RATE_LIMITS } from "../_shared/limits";
import {
  importBlockTree,
  remapPropertyXRefs,
  remapRowProps,
  remapTemplates,
} from "../_shared/idRemap";
import type { BlockLike } from "../_shared/blocks";
import type { Id } from "../_generated/dataModel";

/** Schema validates the export shape produced by Settings → Backup. We
 *  re-validate server-side rather than trust the client because the JSON
 *  is user-supplied (could be hand-edited).
 *
 *  Round-trip discipline (cycle 6, 2026-05-09):
 *  - Page-level state flags (`isPublic`, `shareSlug`, `shareIndexable`,
 *    `wiki`, `trashed`) are now accepted server-side. Cross-workspace
 *    safety: `shareSlug` collisions force-drop; `wiki.ownerId` is
 *    rewritten to importer; `isPublic` is honored as-is (caller already
 *    confirmed import). Derived fields (`databaseHostFor`, `blockCount`,
 *    `previewText`) are dropped — recomputed on next read.
 *  - Block ids regenerated on import (cross-source collision avoidance).
 *  - Inline `/p/<id>` mentions inside block text/caption/tableRows
 *    rewritten via `pageMap` (`_shared/idRemap.ts`).
 *  - Property cross-refs (`relationDatabaseId`, `buttonActions[].pageId`)
 *    + relation `rowProps` arrays rewritten.
 *  - Snapshots bundled when present in the JSON; pageId rewritten,
 *    block ids regenerated.
 */
const SnapshotImport = z.object({
  pageId: z.string().min(1),
  authorName: z.string().max(120).default(""),
  takenAt: z.number(),
  title: z.string().max(200).default(""),
  icon: z.string().max(200).default("📄"),
  cover: z.union([z.string(), z.null()]).optional(),
  blocks: z.array(z.unknown()).max(2_000).default([]),
  rowProps: z.unknown().optional(),
});

const PageImport = z.object({
  id: z.string().min(1),
  parentId: z.union([z.string(), z.null()]).optional(),
  title: z.string().max(200).default(""),
  icon: z.string().max(200).default("📄"),
  cover: z.union([z.string(), z.null()]).optional(),
  blocks: z.array(z.unknown()).max(2_000).default([]),
  favorite: z.boolean().optional(),
  trashed: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  shareSlug: z.string().optional(),
  shareIndexable: z.boolean().optional(),
  wiki: z.object({
    ownerId: z.string(),
    ownerName: z.string(),
    ownerIcon: z.string(),
    verified: z.boolean(),
    verifiedAt: z.number().optional(),
  }).optional(),
  rowOfDatabaseId: z.string().optional(),
  rowProps: z.unknown().optional(),
  font: z.string().optional(),
  smallText: z.boolean().optional(),
  fullWidth: z.boolean().optional(),
  locked: z.boolean().optional(),
});

const DatabaseImport = z.object({
  id: z.string().min(1),
  name: z.string().max(200).default(""),
  icon: z.string().max(200).default("🗂️"),
  properties: z.array(z.unknown()).max(200).default([]),
  rowIds: z.array(z.string()).max(5_000).default([]),
  views: z.array(z.unknown()).max(50).default([]),
  activeViewId: z.string().min(1),
  uniqueIdCounter: z.number().optional(),
  templates: z.array(z.unknown()).optional(),
  defaultTemplateId: z.union([z.string(), z.null()]).optional(),
  subItemsParentPropId: z.union([z.string(), z.null()]).optional(),
  trashed: z.boolean().optional(),
});

const ImportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  workspace: z.object({ name: z.string(), emoji: z.string() }).optional(),
  preferences: z.unknown().optional(),
  pages: z.array(PageImport).max(COUNT_CAPS.importPagesPerFile),
  databases: z.array(DatabaseImport).max(COUNT_CAPS.importDbsPerFile),
  snapshots: z.array(SnapshotImport).max(5_000).optional(),
});

interface PropertyLike {
  id?: string;
  type?: string;
  [k: string]: unknown;
}

export const importFromJson = mutation({
  args: { json: v.string() },
  handler: async (ctx, { json }) => {
    if (json.length > FILE_SIZES.workspaceJsonBytes) {
      throw new Error(`Import too large (max ${FILE_SIZES.workspaceJsonBytes / 1024 / 1024} MB)`);
    }
    const userId = await requireAuth(ctx);
    await rateLimit(ctx, userId, RATE_LIMITS.importWorkspace);

    let raw: unknown;
    try { raw = JSON.parse(json); } catch { throw new Error("Invalid JSON"); }
    const parsed = ImportSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Import file shape is wrong: " + parsed.error.issues[0]?.message);
    }
    const data = parsed.data;
    const now = Date.now();

    // Pre-scan slug uniqueness so collisions force-drop instead of
    // throwing mid-import. Single-shot index probe per slug.
    const slugDrops = new Set<string>();
    for (const p of data.pages) {
      if (!p.shareSlug) continue;
      const existing = await ctx.db
        .query("pages")
        .withIndex("by_share_slug", (q) => q.eq("shareSlug", p.shareSlug as string))
        .unique();
      if (existing) slugDrops.add(p.id);
    }

    // Phase 1: insert pages with no relationships, capture id remap.
    // Block content is empty here — we don't have dbMap yet.
    const pageMap = new Map<string, string>();
    for (const p of data.pages) {
      const newId = await ctx.db.insert("pages", {
        userId,
        parentId: null,
        title: p.title ?? "",
        icon: p.icon ?? "📄",
        cover: p.cover ?? null,
        blocks: [],
        favorite: !!p.favorite,
        trashed: !!p.trashed,
        isPublic: !!p.isPublic,
        shareSlug: !slugDrops.has(p.id) ? p.shareSlug : undefined,
        shareIndexable: p.shareIndexable,
        // Wiki ownership rewritten to importer — cross-workspace
        // ownerId is meaningless. Other fields (verified, verifiedAt,
        // ownerName/Icon) are kept verbatim.
        wiki: p.wiki ? {
          ownerId: userId,
          ownerName: p.wiki.ownerName,
          ownerIcon: p.wiki.ownerIcon,
          verified: p.wiki.verified,
          verifiedAt: p.wiki.verifiedAt,
        } : undefined,
        rowOfDatabaseId: undefined,
        rowProps: undefined, // patched in phase 3 once dbMap is built
        font: p.font,
        smallText: p.smallText,
        fullWidth: p.fullWidth,
        locked: p.locked,
        searchText: undefined,
        createdAt: now,
        updatedAt: now,
      });
      pageMap.set(p.id, newId as unknown as string);
    }

    // Phase 2: insert databases with no rowIds + no property cross-refs.
    const dbMap = new Map<string, string>();
    for (const d of data.databases) {
      const newId = await ctx.db.insert("databases", {
        userId,
        name: d.name ?? "Untitled database",
        icon: d.icon ?? "🗂️",
        properties: [], // patched in phase 4 once dbMap is built
        rowIds: [],
        views: d.views ?? [],
        activeViewId: d.activeViewId,
        uniqueIdCounter: d.uniqueIdCounter,
        templates: undefined, // patched in phase 4
        defaultTemplateId: d.defaultTemplateId ?? undefined,
        subItemsParentPropId: d.subItemsParentPropId ?? undefined,
        trashed: d.trashed,
        createdAt: now,
        updatedAt: now,
      });
      dbMap.set(d.id, newId as unknown as string);
    }

    const maps = { pageMap, dbMap };

    // Phase 3: patch pages — parentId, rowOfDatabaseId, rowProps
    // (with relation array remap), blocks (regen ids + ref remap +
    // mention rewrite via importBlockTree).
    for (const p of data.pages) {
      const newId = pageMap.get(p.id);
      if (!newId) continue;
      const newParent = p.parentId && pageMap.has(p.parentId)
        ? pageMap.get(p.parentId)!
        : null;
      const newRowOfDb = p.rowOfDatabaseId && dbMap.has(p.rowOfDatabaseId)
        ? dbMap.get(p.rowOfDatabaseId)!
        : undefined;
      const remappedBlocks = importBlockTree((p.blocks ?? []) as BlockLike[], maps);

      // rowProps relation arrays need pageMap rewrite. Use the SOURCE
      // database's properties to know which prop ids are relations.
      let nextRowProps = p.rowProps as Record<string, unknown> | undefined;
      if (nextRowProps && p.rowOfDatabaseId) {
        const srcDb = data.databases.find((d) => d.id === p.rowOfDatabaseId);
        if (srcDb) {
          nextRowProps = remapRowProps(
            nextRowProps,
            srcDb.properties as PropertyLike[],
            pageMap,
          );
        }
      }

      await ctx.db.patch(newId as Id<"pages">, {
        parentId: newParent,
        rowOfDatabaseId: newRowOfDb,
        rowProps: nextRowProps,
        blocks: remappedBlocks,
      });
    }

    // Phase 4: patch databases — properties (cross-refs), rowIds,
    // templates (block tree).
    for (const d of data.databases) {
      const newId = dbMap.get(d.id);
      if (!newId) continue;
      const newRowIds = (d.rowIds ?? [])
        .map((rid) => pageMap.get(rid))
        .filter((x): x is string => !!x);
      const remappedProps = remapPropertyXRefs(d.properties ?? [], maps);
      const remappedTemplates = remapTemplates(d.templates, maps);
      await ctx.db.patch(newId as Id<"databases">, {
        rowIds: newRowIds,
        properties: remappedProps,
        templates: remappedTemplates as Record<string, unknown>[] | undefined,
      });
    }

    // Phase 5: snapshots. Must run after pages exist so `pageId` can be
    // remapped + we can probe ownership.
    let snapshotsImported = 0;
    for (const s of data.snapshots ?? []) {
      const newPageId = pageMap.get(s.pageId);
      if (!newPageId) continue; // page wasn't in this bundle — skip
      const blocks = importBlockTree((s.blocks ?? []) as BlockLike[], maps);
      await ctx.db.insert("snapshots", {
        userId,
        pageId: newPageId,
        authorId: userId, // cross-workspace authorId meaningless
        authorName: s.authorName ?? "",
        takenAt: s.takenAt,
        title: s.title,
        icon: s.icon,
        cover: s.cover ?? null,
        blocks,
        rowProps: s.rowProps,
      });
      snapshotsImported += 1;
    }

    return {
      pages: data.pages.length,
      databases: data.databases.length,
      snapshots: snapshotsImported,
      slugCollisions: slugDrops.size,
    };
  },
});
