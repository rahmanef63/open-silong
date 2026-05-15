import type { Block, Page } from "@/shared/types/domain";

export interface SourceLookup {
  page: Page;
  block: Block;
  /** True when the resolved source's children transitively contain a ref
   *  back to the same syncId — rendering would loop infinitely. Caller is
   *  expected to render a cycle warning instead of mirroring children. */
  cycle?: boolean;
}

export interface FindSourceOpts {
  /** Skip a specific block id during the walk — used by ref blocks so they
   *  don't accidentally identify themselves as their own source. */
  excludeBlockId?: string;
  /** When set, restricts the search to pages whose `workspaceId` matches
   *  (or is unset — legacy data passthrough). Prevents a synced ref in
   *  workspace A from resolving against a source in workspace B that
   *  happens to be cached in the same store snapshot. */
  viewerWorkspaceId?: string;
}

/** Walks every page's block tree (top-level + nested children + columns)
 *  to find the canonical source block for a given syncId.
 *
 *  Source = block with `type === "synced"` AND `syncId === target` AND
 *  NOT `syncRef`. The first such block found is treated as canonical
 *  (we don't enforce uniqueness — Notion behaves the same when a sync
 *  link is duplicated; first-found wins).
 *
 *  When a source is found, the returned lookup also reports whether
 *  rendering it would cycle (descendant ref to the same syncId).
 */
export function findSyncedSource(
  syncId: string,
  pages: Page[],
  opts: FindSourceOpts = {},
): SourceLookup | null {
  const { excludeBlockId, viewerWorkspaceId } = opts;
  for (const page of pages) {
    if (page.trashed) continue;
    if (
      viewerWorkspaceId !== undefined &&
      page.workspaceId &&
      page.workspaceId !== viewerWorkspaceId
    ) {
      continue;
    }
    const found = findInBlockList(page.blocks ?? [], syncId, excludeBlockId);
    if (found) {
      return {
        page,
        block: found,
        cycle: containsRefToSyncId(found.children ?? [], syncId),
      };
    }
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

/** True when any descendant of `blocks` is a synced REF whose syncId matches.
 *  Used to detect direct + nested cycles (ref nested inside its own source). */
function containsRefToSyncId(blocks: Block[], syncId: string): boolean {
  for (const b of blocks) {
    if (b.type === "synced" && b.syncRef && b.syncId === syncId) return true;
    if (b.children?.length && containsRefToSyncId(b.children, syncId)) return true;
    if (b.columns?.length) {
      for (const col of b.columns) {
        if (containsRefToSyncId(col, syncId)) return true;
      }
    }
  }
  return false;
}

/** Marks a block as a sync reference. Caller is responsible for setting
 *  block.type = "synced" and providing the syncId beforehand. */
export function makeSyncRef(syncId: string): Pick<Block, "syncId" | "syncRef" | "children"> {
  return { syncId, syncRef: true, children: undefined };
}
