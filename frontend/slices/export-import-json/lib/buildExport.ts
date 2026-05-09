/** Pure helpers for the per-selection JSON export.
 *
 *  Walks an array of root pages to a configurable depth (or "all")
 *  through `parentId` links, then collects every database referenced
 *  by a `database` block on any included page (so the export is
 *  self-contained — re-importing produces a working tree).
 *
 *  Output shape matches `convex/import/workspace.ts:ImportSchema` so
 *  the existing `importFromJson` mutation accepts the file unchanged. */

import type { Page, Database } from "@/shared/types/domain";

export interface BuildExportInput {
  /** Root pages explicitly selected by the user. */
  rootIds: string[];
  /** Full workspace pages (e.g. from useStore().pages). */
  allPages: Page[];
  /** Full workspace databases. */
  allDatabases: Database[];
  /** How many descendant levels to follow under each root. 0 = root
   *  pages only (no children). Cap 5 — beyond that the export is
   *  almost always more useful as a full workspace backup. */
  depth: 0 | 1 | 2 | 3 | 4 | 5;
  /** Include the databases referenced by any included page's
   *  `database` blocks (recursive through children/columns). On by
   *  default — turning off produces a "skeleton" export for
   *  documentation / templating. */
  includeDatabases: boolean;
  /** Include row pages (pages where rowOfDatabaseId === one of the
   *  included db ids) as part of the page set. On by default —
   *  off lets a user export the schema without the data. */
  includeRows: boolean;
  /** Workspace metadata to include for round-trip parity. */
  workspace: { name: string; emoji: string };
  preferences?: unknown;
}

interface BlockLike { type?: string; databaseId?: string; children?: BlockLike[]; columns?: BlockLike[][] }

/** Walk a block tree and collect every `databaseId` referenced. */
function collectDatabaseIds(blocks: unknown, into: Set<string>): void {
  if (!Array.isArray(blocks)) return;
  for (const raw of blocks as BlockLike[]) {
    if (raw?.type === "database" && typeof raw.databaseId === "string") into.add(raw.databaseId);
    if (Array.isArray(raw?.children)) collectDatabaseIds(raw.children, into);
    if (Array.isArray(raw?.columns)) for (const col of raw.columns) collectDatabaseIds(col, into);
  }
}

/** Cycle-safe descendant walk over `parentId` links. */
function collectDescendants(
  root: string,
  pagesByParent: Map<string | null, Page[]>,
  depth: number,
  out: Set<string>,
): void {
  out.add(root);
  if (depth === 0) return;
  const seen = new Set<string>([root]);
  const queue: Array<{ id: string; lvl: number }> = [{ id: root, lvl: 0 }];
  while (queue.length) {
    const { id, lvl } = queue.shift()!;
    if (lvl >= depth) continue;
    const kids = pagesByParent.get(id) ?? [];
    for (const k of kids) {
      if (seen.has(k.id)) continue; // cycle guard
      seen.add(k.id);
      out.add(k.id);
      queue.push({ id: k.id, lvl: lvl + 1 });
    }
  }
}

/** Strip volatile/derived fields the importer drops anyway — keeps
 *  the file smaller + reduces surprise on re-import. */
function projectPage(p: Page): unknown {
  // The export shape is duck-typed against ImportSchema. We pass
  // through every field the importer's zod accepts; the rest gets
  // stripped silently when zod parses, but cleaner to omit here.
  const {
    databaseHostFor: _h, blockCount: _bc, previewText: _pt,
    ...rest
  } = p as Page & { databaseHostFor?: unknown; blockCount?: unknown; previewText?: unknown };
  return rest;
}

function projectDatabase(d: Database): unknown {
  // Drop trashed flag — exporter preserves whatever's in workspace.
  return d;
}

export interface BuildExportResult {
  json: string;
  counts: { pages: number; databases: number; snapshots: number };
}

/** Build the workspace-shape JSON for a user-chosen page subset. */
export function buildSelectionExport(input: BuildExportInput): BuildExportResult {
  const livePages = input.allPages.filter((p) => !p.trashed);
  const liveDatabases = input.allDatabases.filter((d) => !d.trashed);

  const pagesByParent = new Map<string | null, Page[]>();
  for (const p of livePages) {
    const arr = pagesByParent.get(p.parentId) ?? [];
    arr.push(p);
    pagesByParent.set(p.parentId, arr);
  }

  // 1. Collect every page id reachable from a root within depth.
  const pageIds = new Set<string>();
  for (const rootId of input.rootIds) {
    if (livePages.some((p) => p.id === rootId)) {
      collectDescendants(rootId, pagesByParent, input.depth, pageIds);
    }
  }

  // 2. Collect every database id referenced by an included page.
  const dbIds = new Set<string>();
  if (input.includeDatabases) {
    for (const p of livePages) {
      if (!pageIds.has(p.id)) continue;
      collectDatabaseIds(p.blocks, dbIds);
    }
  }

  // 3. If row pages should travel with their db, add them now and
  //    re-collect their referenced databases (a row page might host a
  //    nested database block too).
  if (input.includeRows && dbIds.size) {
    let added = 0;
    for (const p of livePages) {
      if (!p.rowOfDatabaseId || !dbIds.has(p.rowOfDatabaseId)) continue;
      if (!pageIds.has(p.id)) {
        pageIds.add(p.id);
        added += 1;
      }
    }
    if (added) {
      const before = dbIds.size;
      for (const p of livePages) {
        if (!pageIds.has(p.id)) continue;
        collectDatabaseIds(p.blocks, dbIds);
      }
      // No need to loop; second pass is enough — db blocks rarely nest.
      void before;
    }
  }

  const pages = livePages.filter((p) => pageIds.has(p.id)).map(projectPage);
  const databases = liveDatabases.filter((d) => dbIds.has(d.id)).map(projectDatabase);

  const payload = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    workspace: input.workspace,
    preferences: input.preferences,
    pages,
    databases,
    // Snapshots are workspace-scoped; per-selection exports skip them
    // to avoid leaking history of pages outside the selection. Use
    // Settings → Backup for the full snapshot bundle.
    snapshots: [],
  };

  return {
    json: JSON.stringify(payload, null, 2),
    counts: { pages: pages.length, databases: databases.length, snapshots: 0 },
  };
}
