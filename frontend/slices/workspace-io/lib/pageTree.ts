/** Flatten workspace pages into a depth-indented ordered list for the
 *  ExportTab picker. Skips row pages (they travel with their db). */

import type { Page } from "@/shared/types/domain";

export interface TreeRow {
  id: string;
  title: string;
  icon: string;
  depth: number;
}

export function flattenPageTree(pages: Page[], maxDepth = 6): TreeRow[] {
  const live = pages.filter((p) => !p.trashed);
  const byParent = new Map<string | null, Page[]>();
  for (const p of live) {
    const arr = byParent.get(p.parentId) ?? [];
    arr.push(p);
    byParent.set(p.parentId, arr);
  }
  for (const arr of byParent.values()) arr.sort((a, b) => a.title.localeCompare(b.title));

  const out: TreeRow[] = [];
  function walk(parentId: string | null, lvl: number) {
    for (const p of byParent.get(parentId) ?? []) {
      if (p.rowOfDatabaseId) continue;
      out.push({ id: p.id, title: p.title || "Untitled", icon: p.icon, depth: lvl });
      if (lvl < maxDepth) walk(p.id, lvl + 1);
    }
  }
  walk(null, 0);
  return out;
}
