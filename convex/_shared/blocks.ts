/** Server-side block-tree helpers.
 *
 *  Mirrors `frontend/slices/editor/lib/blockTree.ts` for operations
 *  that need to run inside Convex (duplicate, snapshot restore,
 *  workspace import). Server can't import frontend code (different
 *  build), so we keep the surface minimal here and add helpers as
 *  needed.
 *
 *  Block shape is intentionally `BlockLike` — Convex schema declares
 *  `blocks: v.array(v.any())` because the discriminated union is too
 *  wide. Helpers walk the structural fields only (`id`, `children`,
 *  `columns`, `text`, `caption`, `tableRows`).
 */

import { uid } from "./uid";

export interface BlockLike {
  id?: string;
  text?: string;
  caption?: string;
  children?: BlockLike[];
  columns?: BlockLike[][];
  tableRows?: string[][];
  [key: string]: unknown;
}

/** Recursively regenerate block ids across `children` and `columns`.
 *  Returns a structurally identical tree with fresh ids — every
 *  reachable block gets a new id, no collisions intra-page.
 *
 *  Use case: `pages.duplicate` (avoids cross-page id collisions when
 *  the duplicate's blocks are later moved into a deeper tree),
 *  workspace import (regen ids when source workspace's ids overlap
 *  with target's). */
export function regenBlockIdsDeep(b: BlockLike): BlockLike {
  const next: BlockLike = { ...b, id: uid() };
  if (Array.isArray(b.children)) {
    next.children = b.children.map(regenBlockIdsDeep);
  }
  if (Array.isArray(b.columns)) {
    next.columns = b.columns.map((col) =>
      Array.isArray(col) ? col.map(regenBlockIdsDeep) : col,
    );
  }
  return next;
}

/** Apply `regenBlockIdsDeep` over an array of top-level blocks. */
export function regenAllBlockIds(blocks: BlockLike[]): BlockLike[] {
  return blocks.map(regenBlockIdsDeep);
}

/** Visitor — invoke `fn` on every block reachable through children
 *  and columns. Iterative to avoid stack blowups on deeply nested
 *  toggle/column trees. */
export function walkBlocks(
  blocks: BlockLike[],
  fn: (b: BlockLike) => void,
): void {
  const stack: BlockLike[] = [...blocks];
  while (stack.length) {
    const b = stack.pop()!;
    fn(b);
    if (Array.isArray(b.children)) stack.push(...b.children);
    if (Array.isArray(b.columns)) {
      for (const col of b.columns) {
        if (Array.isArray(col)) stack.push(...col);
      }
    }
  }
}

/** Check that no two reachable blocks share an id. Returns the
 *  duplicate id if found, else null. */
export function findDuplicateBlockId(blocks: BlockLike[]): string | null {
  const seen = new Set<string>();
  let dup: string | null = null;
  walkBlocks(blocks, (b) => {
    if (dup !== null) return;
    if (typeof b.id === "string") {
      if (seen.has(b.id)) { dup = b.id; return; }
      seen.add(b.id);
    }
  });
  return dup;
}
