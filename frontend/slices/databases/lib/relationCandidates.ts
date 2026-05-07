/** Pure helpers for the Relation cell picker.
 *
 *  Splits picking semantics from rendering so we can unit-test the
 *  candidate-list behavior under tricky workspaces (no rows yet,
 *  target db missing, query empty, etc.). */

import type { Page } from "@/shared/types/domain";

interface FilterArgs {
  pages: Page[];
  /** The page hosting the cell — excluded so a row never relates to itself. */
  selfRowId: string;
  /** Target database id. `null | undefined` means "all database rows". */
  targetDbId: string | null | undefined;
  /** True when `targetDbId` is set but the DB is missing from the
   *  workspace (e.g. trashed). Treat like "no target" so the user can
   *  still pick something. */
  targetDbMissing: boolean;
  /** Free-text filter (case-insensitive substring on title). */
  query: string;
  /** Hard cap on rendered rows (perf guard). */
  cap?: number;
}

/** Compute the candidate list for the relation picker.
 *
 *  Rules:
 *  - If a target db is set and exists, candidates are STRICTLY rows of
 *    that db (`p.rowOfDatabaseId === targetDbId`). Empty target db →
 *    empty list (user clicks the "+ Create new" affordance to seed).
 *  - If no target db (legacy "all database rows") OR the target is
 *    missing, candidates fall back to: any database row in the
 *    workspace; if there are NONE, regular non-row pages are
 *    surfaced so legacy free-form linking still works.
 *  - The hosting row is always excluded.
 *  - Trashed pages are always excluded.
 *
 *  Returns up to `cap` matches (default 40). */
export function filterRelationCandidates({
  pages, selfRowId, targetDbId, targetDbMissing, query, cap = 40,
}: FilterArgs): Page[] {
  const q = query.trim().toLowerCase();
  const matchQuery = (p: Page) =>
    !q || `${p.title} ${p.icon}`.toLowerCase().includes(q);

  const live = pages.filter(
    (p) => !p.trashed && p.id !== selfRowId,
  );

  // Strict mode — target set + present
  if (targetDbId && !targetDbMissing) {
    return live
      .filter((p) => p.rowOfDatabaseId === targetDbId)
      .filter(matchQuery)
      .slice(0, cap);
  }

  // Legacy / fallback mode — no target or target missing
  const dbRows = live.filter((p) => p.rowOfDatabaseId);
  const base = dbRows.length ? dbRows : live.filter((p) => !p.rowOfDatabaseId);
  return base.filter(matchQuery).slice(0, cap);
}
