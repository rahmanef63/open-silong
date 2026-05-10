import type { Database, Page } from "@/shared/types/domain";

export type LibrarySectionKey = "recents" | "favorites" | "shared" | "private";

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

/** Split the workspace's pages into the four Library tab buckets.
 *  Excludes trashed pages and database rows from every bucket.
 *  Order within each bucket is intentional:
 *    - recents → most-recent-first by recentIds
 *    - favorites/shared/private → updatedAt desc */
export function groupPagesForLibrary({
  pages,
  recentIds,
  recentLimit = 20,
}: GroupOptions): LibrarySection[] {
  const visible = pages.filter((p) => !p.trashed && !p.rowOfDatabaseId);
  const byId = new Map(visible.map((p) => [p.id, p]));
  const sortByUpdated = (arr: Page[]) =>
    [...arr].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

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

  const favorites = sortByUpdated(visible.filter((p) => !!p.favorite));
  const shared = sortByUpdated(visible.filter((p) => !!p.isPublic));
  // Top-level only for "Private" (matches Notion's Private section).
  const privatePages = sortByUpdated(visible.filter(
    (p) => !p.isPublic && (p.parentId === null || p.parentId === undefined),
  ));

  return [
    { key: "recents", label: "Recents", pages: recents },
    { key: "favorites", label: "Favorites", pages: favorites },
    { key: "shared", label: "Shared", pages: shared },
    { key: "private", label: "Private", pages: privatePages },
  ];
}

/** Immediate parent of a page — the surface displayed in the Source
 *  column. Returns:
 *    - `database` when the page is a row of a database (label = db name)
 *    - `page` when the page has a parent page (label = parent title)
 *    - `root` otherwise (label = "Root")
 *  Always resolves; never throws. Unknown parents fall back to `root`
 *  so the table never shows a dangling id. */
export interface PageSource {
  kind: "root" | "page" | "database";
  label: string;
  icon?: string;
  /** Target id for click-through. `null` for root. */
  targetId: string | null;
}

export function pageSource(
  page: Page,
  pages: Page[],
  databases: Database[],
): PageSource {
  if (page.rowOfDatabaseId) {
    const db = databases.find((d) => d.id === page.rowOfDatabaseId);
    if (db) return { kind: "database", label: db.name || "Untitled database", icon: db.icon, targetId: db.id };
    return { kind: "root", label: "Root", targetId: null };
  }
  if (page.parentId) {
    const parent = pages.find((p) => p.id === page.parentId);
    if (parent) return { kind: "page", label: parent.title || "Untitled", icon: parent.icon, targetId: parent.id };
    return { kind: "root", label: "Root", targetId: null };
  }
  return { kind: "root", label: "Root", targetId: null };
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
