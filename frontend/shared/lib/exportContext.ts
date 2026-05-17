/** Shared context for page → MD/HTML serialization.
 *
 *  When a page contains a `database` block, the exporter needs the
 *  database schema + rows to render an inline table — otherwise the
 *  output is a useless stub link. Callers (per-page kabab export,
 *  workspace ZIP) build this from the store once and pass it through. */

import type { Database, Page } from "../types/domain";

export interface ExportContext {
  databases: Database[];
  rowsByDb: Map<string, Page[]>;
  /** All non-trashed pages — used by relation property formatting. */
  allPages: Page[];
}

export function buildExportContext(databases: Database[], pages: Page[]): ExportContext {
  const live = pages.filter((p) => !p.trashed);
  const rowsByDb = new Map<string, Page[]>();
  for (const p of live) {
    if (!p.rowOfDatabaseId) continue;
    const arr = rowsByDb.get(p.rowOfDatabaseId) ?? [];
    arr.push(p);
    rowsByDb.set(p.rowOfDatabaseId, arr);
  }
  return { databases, rowsByDb, allPages: live };
}

/** Lookup helper — returns null if the database is missing/trashed. */
export function lookupDb(
  ctx: ExportContext | undefined,
  dbId: string | undefined,
): { db: Database; rows: Page[] } | null {
  if (!ctx || !dbId) return null;
  const db = ctx.databases.find((d) => d.id === dbId && !d.trashed);
  if (!db) return null;
  return { db, rows: ctx.rowsByDb.get(dbId) ?? [] };
}
