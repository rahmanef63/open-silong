import type { Block } from "@/shared/types/domain";

/** Top-level multi-block move helpers. V1 scope: all `ids` must reference
 * blocks that exist at the top level of the page. Nested blocks are ignored
 * by `idsInBlocks`. */

const idsToSet = (ids: string[]) => new Set(ids);

export function topLevelIdsInOrder(blocks: Block[], ids: string[]): string[] {
  const s = idsToSet(ids);
  return blocks.filter((b) => s.has(b.id)).map((b) => b.id);
}

/** Slide the selected group up or down by one position in the top-level list.
 * Group is treated as a unit — relative order preserved, non-contiguous
 * selections are compacted (matches Notion's behavior). */
export function moveTopLevelGroup(blocks: Block[], ids: string[], dir: -1 | 1): Block[] {
  const set = idsToSet(ids);
  const moving = blocks.filter((b) => set.has(b.id));
  if (moving.length === 0) return blocks;
  const remaining = blocks.filter((b) => !set.has(b.id));
  const indices = moving.map((b) => blocks.findIndex((x) => x.id === b.id));
  const minIdx = Math.min(...indices);
  const maxIdx = Math.max(...indices);
  if (dir < 0 && minIdx === 0) return blocks;
  if (dir > 0 && maxIdx === blocks.length - 1) return blocks;
  const newAnchor = Math.max(0, dir < 0 ? minIdx - 1 : minIdx + 1);
  return [...remaining.slice(0, newAnchor), ...moving, ...remaining.slice(newAnchor)];
}

/** Insert the selected group at `targetIndex` of the top-level list (after
 * removing them from their current positions). Used for drop-on-sibling. */
export function placeTopLevelGroupAtBlock(
  blocks: Block[],
  ids: string[],
  overBlockId: string,
): Block[] {
  const set = idsToSet(ids);
  if (set.has(overBlockId)) return blocks; // dropped on self
  const moving = blocks.filter((b) => set.has(b.id));
  if (moving.length === 0) return blocks;
  const remaining = blocks.filter((b) => !set.has(b.id));
  const overIdx = remaining.findIndex((b) => b.id === overBlockId);
  if (overIdx < 0) return blocks;
  return [...remaining.slice(0, overIdx), ...moving, ...remaining.slice(overIdx)];
}

/** Append all selected top-level blocks to the END of a container (toggle's
 * children, or one of a columns block's column panes). */
export function appendTopLevelGroupToContainer(
  blocks: Block[],
  ids: string[],
  containerId: string,
  kind: "toggle" | "column",
  columnIndex?: number,
): Block[] {
  if (ids.includes(containerId)) return blocks; // can't drop into self
  const set = idsToSet(ids);
  const moving = blocks.filter((b) => set.has(b.id));
  if (moving.length === 0) return blocks;
  const remaining = blocks.filter((b) => !set.has(b.id));
  return remaining.map((b) => {
    if (b.id !== containerId) return b;
    if (kind === "toggle") {
      return { ...b, children: [...(b.children ?? []), ...moving], collapsed: false };
    }
    const cols = b.columns ?? [];
    const ci = columnIndex ?? 0;
    const newCols = cols.map((c, i) => (i === ci ? [...c, ...moving] : c));
    return { ...b, columns: newCols };
  });
}
