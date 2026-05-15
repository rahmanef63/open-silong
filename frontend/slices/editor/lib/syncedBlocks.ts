import type { Block, Page } from "@/shared/types/domain";

export interface SourceLookup {
  page: Page;
  block: Block;
}

/** Walks every page's block tree (top-level + nested children + columns)
 *  to find the canonical source block for a given syncId.
 *
 *  Source = block with `type === "synced"` AND `syncId === target` AND
 *  NOT `syncRef`. The first such block found is treated as canonical
 *  (we don't enforce uniqueness — Notion behaves the same when a sync
 *  link is duplicated; first-found wins).
 *
 *  `excludeBlockId` skips a specific block id during the walk — used by
 *  ref blocks so they don't accidentally identify themselves as their
 *  own source when imported in unexpected configurations.
 */
export function findSyncedSource(
  syncId: string,
  pages: Page[],
  excludeBlockId?: string,
): SourceLookup | null {
  for (const page of pages) {
    if (page.trashed) continue;
    const found = findInBlockList(page.blocks ?? [], syncId, excludeBlockId);
    if (found) return { page, block: found };
  }
  return null;
}

function findInBlockList(blocks: Block[], syncId: string, exclude?: string): Block | null {
  for (const b of blocks) {
    if (b.id !== exclude && b.type === "synced" && b.syncId === syncId && !b.syncRef) {
      return b;
    }
    // Recurse into containers — sources can live inside toggles, columns,
    // synced blocks themselves, etc.
    if (b.children?.length) {
      const inner = findInBlockList(b.children, syncId, exclude);
      if (inner) return inner;
    }
    if (b.columns?.length) {
      for (const col of b.columns) {
        const inner = findInBlockList(col, syncId, exclude);
        if (inner) return inner;
      }
    }
  }
  return null;
}

/** Marks a block as a sync reference. Caller is responsible for setting
 *  block.type = "synced" and providing the syncId beforehand. */
export function makeSyncRef(syncId: string): Pick<Block, "syncId" | "syncRef" | "children"> {
  return { syncId, syncRef: true, children: undefined };
}
