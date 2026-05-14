import type { Database, Page } from "@/shared/types/domain";

export interface SubItemTreeNode {
  row: Page;
  depth: number;
  childCount: number;
  /** Has children visible in the current row set (post-filter). */
  hasChildren: boolean;
}

/** Build a flat ordered tree of rows where parent → children is determined
 *  by `db.subItemsParentPropId`. When that prop isn't set, returns rows
 *  in their original order at depth 0.
 *
 *  Parent reference: relation value is `string[]` — first entry wins. Rows
 *  whose parent doesn't exist in the current set become top-level (so
 *  filtering by parent doesn't orphan children visually). Cycles are
 *  broken by the visited-set guard (an already-rendered row never
 *  re-renders deeper). */
export function buildSubItemsTree(
  db: Database,
  rows: Page[],
  expanded: Set<string>,
): SubItemTreeNode[] {
  const parentPropId = db.subItemsParentPropId ?? null;
  if (!parentPropId) {
    return rows.map((row) => ({ row, depth: 0, childCount: 0, hasChildren: false }));
  }

  const rowMap = new Map(rows.map((r) => [r.id, r]));
  const childrenByParent = new Map<string, string[]>();
  const topLevel: string[] = [];

  for (const row of rows) {
    const raw = row.rowProps?.[parentPropId];
    const parentId = Array.isArray(raw) ? raw[0] : undefined;
    if (parentId && rowMap.has(parentId) && parentId !== row.id) {
      const list = childrenByParent.get(parentId) ?? [];
      list.push(row.id);
      childrenByParent.set(parentId, list);
    } else {
      topLevel.push(row.id);
    }
  }

  const out: SubItemTreeNode[] = [];
  const visited = new Set<string>();
  const walk = (id: string, depth: number) => {
    if (visited.has(id)) return;
    visited.add(id);
    const row = rowMap.get(id);
    if (!row) return;
    const childIds = childrenByParent.get(id) ?? [];
    out.push({
      row,
      depth,
      childCount: childIds.length,
      hasChildren: childIds.length > 0,
    });
    if (expanded.has(id)) {
      for (const cid of childIds) walk(cid, depth + 1);
    }
  };
  for (const id of topLevel) walk(id, 0);
  // Catch-all for any rows trapped in cycles — render at top level so
  // they're still reachable.
  for (const row of rows) {
    if (!visited.has(row.id)) walk(row.id, 0);
  }
  return out;
}
