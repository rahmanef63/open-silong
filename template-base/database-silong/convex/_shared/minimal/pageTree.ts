/** Page-tree helpers operating on the user-owned page set.
 *
 *  Lifted from the duplicated `collectDescendants` blocks in
 *  `pages.{trash,restore,permanentlyDelete}`. Single source means a
 *  bug fix (e.g. cycle detection, depth cap) lands once.
 *
 *  Convention: callers pass an already-fetched array of pages
 *  (typically from `ctx.db.query("pages").withIndex("by_user")` ),
 *  so the helper is pure and trivially testable.
 */

import type { Doc, Id } from "../_generated/dataModel";

export interface PageTreeNode {
  _id: Id<"pages">;
  parentId: string | null;
}

/** Return ids of `rootId` plus every descendant via `parentId`.
 *  Pure — caller supplies the `pages` array (typically the user's
 *  own owned pages). Self-cycle safe: visited set prevents infinite
 *  recursion if a corrupt parent chain points back at itself. */
export function collectDescendants(
  pages: PageTreeNode[],
  rootId: string,
): string[] {
  const byParent = new Map<string | null, string[]>();
  for (const p of pages) {
    const arr = byParent.get(p.parentId) ?? [];
    arr.push(p._id as unknown as string);
    byParent.set(p.parentId, arr);
  }
  const visited = new Set<string>();
  const out: string[] = [];
  const walk = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    out.push(id);
    for (const childId of byParent.get(id) ?? []) walk(childId);
  };
  walk(rootId);
  return out;
}

/** Stricter form: also accepts `Doc<"pages">[]` directly (the common
 *  shape after `.collect()`). */
export function collectDescendantsFromDocs(
  pages: Doc<"pages">[],
  rootId: string,
): string[] {
  return collectDescendants(
    pages.map((p) => ({ _id: p._id, parentId: p.parentId })),
    rootId,
  );
}
