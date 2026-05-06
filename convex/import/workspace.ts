import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { requireAuth } from "../_shared/auth";
import { rateLimit } from "../_shared/rateLimit";
import type { Id } from "../_generated/dataModel";

/** Schema validates the export shape produced by Settings → Backup. We
 *  re-validate server-side rather than trust the client because the JSON
 *  is user-supplied (could be hand-edited). */
const PageImport = z.object({
  id: z.string().min(1),
  parentId: z.union([z.string(), z.null()]).optional(),
  title: z.string().max(200).default(""),
  icon: z.string().max(200).default("📄"),
  cover: z.union([z.string(), z.null()]).optional(),
  blocks: z.array(z.unknown()).max(2_000).default([]),
  favorite: z.boolean().optional(),
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
});

const ImportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  workspace: z.object({ name: z.string(), emoji: z.string() }).optional(),
  preferences: z.unknown().optional(),
  pages: z.array(PageImport).max(500),
  databases: z.array(DatabaseImport).max(50),
});

interface BlockLike {
  pageId?: string;
  databaseId?: string;
  children?: BlockLike[];
  columns?: BlockLike[][];
  [k: string]: unknown;
}

function remapBlocks(
  blocks: unknown[],
  pageMap: Map<string, Id<"pages">>,
  dbMap: Map<string, Id<"databases">>,
): BlockLike[] {
  return blocks.map((raw) => {
    const b = (raw ?? {}) as BlockLike;
    const out: BlockLike = { ...b };
    if (typeof b.pageId === "string" && pageMap.has(b.pageId)) {
      out.pageId = pageMap.get(b.pageId) as unknown as string;
    }
    if (typeof b.databaseId === "string" && dbMap.has(b.databaseId)) {
      out.databaseId = dbMap.get(b.databaseId) as unknown as string;
    }
    if (Array.isArray(b.children)) {
      out.children = remapBlocks(b.children, pageMap, dbMap);
    }
    if (Array.isArray(b.columns)) {
      out.columns = b.columns.map((col) => remapBlocks(col, pageMap, dbMap));
    }
    return out;
  });
}

export const importFromJson = mutation({
  args: { json: v.string() },
  handler: async (ctx, { json }) => {
    if (json.length > 8 * 1024 * 1024) {
      throw new Error("Import too large (max 8 MB)");
    }
    const userId = await requireAuth(ctx);
    await rateLimit(ctx, userId, { scope: "import.workspace", max: 3, windowMs: 60_000 });

    let raw: unknown;
    try { raw = JSON.parse(json); } catch { throw new Error("Invalid JSON"); }
    const parsed = ImportSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Import file shape is wrong: " + parsed.error.issues[0]?.message);
    }
    const data = parsed.data;
    const now = Date.now();

    // Phase 1: insert pages with no relationships, capture id remap.
    const pageMap = new Map<string, Id<"pages">>();
    for (const p of data.pages) {
      const newId = await ctx.db.insert("pages", {
        userId,
        parentId: null,
        title: p.title ?? "",
        icon: p.icon ?? "📄",
        cover: p.cover ?? null,
        blocks: [],
        favorite: !!p.favorite,
        trashed: false,
        isPublic: false,
        rowOfDatabaseId: undefined,
        rowProps: (p.rowProps as Record<string, unknown> | undefined) ?? undefined,
        font: p.font,
        smallText: p.smallText,
        fullWidth: p.fullWidth,
        locked: p.locked,
        searchText: undefined,
        createdAt: now,
        updatedAt: now,
      });
      pageMap.set(p.id, newId);
    }

    // Phase 2: insert databases with no rowIds.
    const dbMap = new Map<string, Id<"databases">>();
    for (const d of data.databases) {
      const newId = await ctx.db.insert("databases", {
        userId,
        name: d.name ?? "Untitled database",
        icon: d.icon ?? "🗂️",
        properties: d.properties ?? [],
        rowIds: [],
        views: d.views ?? [],
        activeViewId: d.activeViewId,
        uniqueIdCounter: d.uniqueIdCounter,
        templates: d.templates,
        defaultTemplateId: d.defaultTemplateId ?? undefined,
        subItemsParentPropId: d.subItemsParentPropId ?? undefined,
        createdAt: now,
        updatedAt: now,
      });
      dbMap.set(d.id, newId);
    }

    // Phase 3: patch pages — parentId, rowOfDatabaseId, blocks (with
    // page+db id remap inside).
    for (const p of data.pages) {
      const newId = pageMap.get(p.id);
      if (!newId) continue;
      const newParent = p.parentId && pageMap.has(p.parentId)
        ? (pageMap.get(p.parentId) as unknown as string)
        : null;
      const newRowOfDb = p.rowOfDatabaseId && dbMap.has(p.rowOfDatabaseId)
        ? (dbMap.get(p.rowOfDatabaseId) as unknown as string)
        : undefined;
      const remapped = remapBlocks(p.blocks ?? [], pageMap, dbMap);
      await ctx.db.patch(newId, {
        parentId: newParent,
        rowOfDatabaseId: newRowOfDb,
        blocks: remapped,
      });
    }

    // Phase 4: patch databases — remap rowIds to new page ids.
    for (const d of data.databases) {
      const newId = dbMap.get(d.id);
      if (!newId) continue;
      const newRowIds = (d.rowIds ?? [])
        .map((rid) => pageMap.get(rid))
        .filter((x): x is Id<"pages"> => !!x)
        .map((x) => x as unknown as string);
      await ctx.db.patch(newId, { rowIds: newRowIds });
    }

    return { pages: data.pages.length, databases: data.databases.length };
  },
});
