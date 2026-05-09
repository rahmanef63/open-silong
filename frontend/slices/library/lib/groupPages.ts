import type { Page } from "@/shared/types/domain";

export type LibrarySectionKey = "recents" | "favorites" | "shared" | "private" | "all";

export interface LibrarySection {
  key: LibrarySectionKey;
  label: string;
  pages: Page[];
}

export interface GroupOptions {
  pages: Page[];
  recentIds: string[];
  /** Maximum recents shown. Defaults to 20. */
  recentLimit?: number;
}

/** Split the workspace's pages into the five Library sections.
 *  Excludes trashed pages and database rows from every section.
 *  `all` is sorted by updatedAt desc; the other sections preserve
 *  their input order (recents = most-recent-first by recentIds). */
export function groupPagesForLibrary({
  pages,
  recentIds,
  recentLimit = 20,
}: GroupOptions): LibrarySection[] {
  const visible = pages.filter((p) => !p.trashed && !p.rowOfDatabaseId);
  const byId = new Map(visible.map((p) => [p.id, p]));

  const recents: Page[] = [];
  const seen = new Set<string>();
  for (const id of recentIds) {
    if (recents.length >= recentLimit) break;
    if (seen.has(id)) continue;
    const p = byId.get(id);
    if (p) {
      recents.push(p);
      seen.add(id);
    }
  }

  const favorites = visible.filter((p) => !!p.favorite);
  const shared = visible.filter((p) => !!p.isPublic);
  // Top-level only for "Private" (matches Notion's Private section).
  const privatePages = visible.filter(
    (p) => !p.isPublic && (p.parentId === null || p.parentId === undefined),
  );
  const all = [...visible].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  return [
    { key: "recents", label: "Recents", pages: recents },
    { key: "favorites", label: "Favorites", pages: favorites },
    { key: "shared", label: "Shared", pages: shared },
    { key: "private", label: "Private", pages: privatePages },
    { key: "all", label: "All pages", pages: all },
  ];
}

/** Walk parent chain → readable breadcrumb e.g. "Workspace › Projects".
 *  Cycle-safe (depth-capped at 12). */
export function pageBreadcrumb(page: Page, pages: Page[], workspaceName?: string): string {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const trail: string[] = [];
  let cur: Page | undefined = page;
  let depth = 0;
  const seen = new Set<string>();
  while (cur && cur.parentId && !seen.has(cur.id) && depth < 12) {
    seen.add(cur.id);
    const parent = byId.get(cur.parentId);
    if (!parent) break;
    trail.unshift(parent.title || "Untitled");
    cur = parent;
    depth++;
  }
  if (workspaceName) trail.unshift(workspaceName);
  return trail.join(" › ");
}
