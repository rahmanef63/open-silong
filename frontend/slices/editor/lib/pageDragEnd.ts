import type { DragEndEvent } from "@dnd-kit/core";
import type { Block, Page } from "@/shared/types/domain";
import { findLocation, moveBlock, type Location } from "./blockTree";
import { placeTopLevelGroupAtBlock, appendTopLevelGroupToContainer, topLevelIdsInOrder } from "@/slices/block-selection";

interface Deps {
  page: Page;
  updatePage: (id: string, patch: Partial<Page>) => void;
}

/** Move `activeId` to land in the given layout column. Stamps
 *  layoutGroup/Col + repositions to the END of that column's segment in
 *  the flat blocks list. */
function moveBlockToLayoutColumn(
  blocks: Block[],
  activeId: string,
  layoutGroup: string,
  layoutCol: number,
): Block[] {
  const idx = blocks.findIndex((b) => b.id === activeId);
  if (idx < 0) return blocks;
  const active = blocks[idx];
  const without = [...blocks.slice(0, idx), ...blocks.slice(idx + 1)];
  // Insert position = right after the LAST block already in this column.
  let insertAfter = -1;
  for (let i = 0; i < without.length; i++) {
    if (without[i].layoutGroup === layoutGroup && without[i].layoutCol === layoutCol) {
      insertAfter = i;
    }
  }
  // If column is empty, insert at the END of the layout group.
  if (insertAfter < 0) {
    for (let i = 0; i < without.length; i++) {
      if (without[i].layoutGroup === layoutGroup) insertAfter = i;
    }
  }
  const stamped: Block = { ...active, layoutGroup, layoutCol };
  return [...without.slice(0, insertAfter + 1), stamped, ...without.slice(insertAfter + 1)];
}

/** Strip layoutGroup/Col stamps from `activeId` when it lands outside
 *  any layout (e.g. dropped between two non-column blocks). */
function stripLayoutStamps(blocks: Block[], activeId: string): Block[] {
  return blocks.map((b) => {
    if (b.id !== activeId) return b;
    const { layoutGroup: _g, layoutCol: _c, ...rest } = b;
    void _g; void _c;
    return rest;
  });
}

/** Read the active selection straight from the DOM — avoids restructuring
 *  PageEditor to live inside BlockSelectionProvider's hook scope. */
function getSelectedTopLevelIds(blocks: Block[]): string[] {
  const els = document.querySelectorAll<HTMLElement>("[data-block-shell-id][data-block-selected]");
  const all: string[] = [];
  els.forEach((el) => {
    const id = el.dataset.blockShellId;
    if (id) all.push(id);
  });
  return topLevelIdsInOrder(blocks, all);
}

export function handlePageDragEnd(e: DragEndEvent, { page, updatePage }: Deps) {
  const { active, over } = e;
  if (!over || active.id === over.id) return;
  const activeId = String(active.id);
  const overId = String(over.id);

  // ----- Multi-drag: active is a top-level block AND part of selection -----
  const selIds = getSelectedTopLevelIds(page.blocks);
  const isMulti = selIds.length > 1 && selIds.includes(activeId);

  if (isMulti) {
    const colMatch = overId.match(/^col:(.+):(\d+)$/);
    if (colMatch) {
      const [, containerId, colIndexStr] = colMatch;
      const colIndex = Number(colIndexStr);
      const next = appendTopLevelGroupToContainer(page.blocks, selIds, containerId, "column", colIndex);
      if (next !== page.blocks) updatePage(page.id, { blocks: next });
      return;
    }
    const toggleMatch = overId.match(/^toggle:(.+)$/);
    if (toggleMatch) {
      const containerId = toggleMatch[1];
      const next = appendTopLevelGroupToContainer(page.blocks, selIds, containerId, "toggle");
      if (next !== page.blocks) updatePage(page.id, { blocks: next });
      return;
    }
    if (page.blocks.some((b) => b.id === overId)) {
      const next = placeTopLevelGroupAtBlock(page.blocks, selIds, overId);
      if (next !== page.blocks) updatePage(page.id, { blocks: next });
      return;
    }
    // Unrecognized over — fall through to single-block path
  }

  // ----- New layout primitive: drop onto a column pane -----
  const layoutColMatch = overId.match(/^layoutcol:(.+):(\d+)$/);
  if (layoutColMatch) {
    const [, layoutGroup, colIndexStr] = layoutColMatch;
    const colIndex = Number(colIndexStr);
    const next = moveBlockToLayoutColumn(page.blocks, activeId, layoutGroup, colIndex);
    if (next !== page.blocks) updatePage(page.id, { blocks: next });
    return;
  }

  const from = findLocation(page.blocks, activeId);
  if (!from) return;

  const colMatch = overId.match(/^col:(.+):(\d+)$/);
  if (colMatch) {
    const [, containerId, colIndexStr] = colMatch;
    if (containerId === activeId) return;
    const colIndex = Number(colIndexStr);
    const container = page.blocks.find((b) => b.id === containerId);
    const colLen = container?.columns?.[colIndex]?.length ?? 0;
    const to: Location = { kind: "col", containerId, colIndex, index: colLen };
    updatePage(page.id, { blocks: moveBlock(page.blocks, from, to) });
    return;
  }
  const toggleMatch = overId.match(/^toggle:(.+)$/);
  if (toggleMatch) {
    const containerId = toggleMatch[1];
    if (containerId === activeId) return;
    const container = page.blocks.find((b) => b.id === containerId);
    const childLen = container?.children?.length ?? 0;
    const to: Location = { kind: "toggle", containerId, index: childLen };
    updatePage(page.id, { blocks: moveBlock(page.blocks, from, to) });
    return;
  }

  const overLoc = findLocation(page.blocks, overId);
  if (!overLoc) return;

  // Cross-column / column-escape: when dropping ON a flat block, inherit
  // its layout stamps (or strip if the over block has none).
  const activeBlock = page.blocks.find((b) => b.id === activeId);
  const overBlock = page.blocks.find((b) => b.id === overId);
  if (activeBlock && overBlock) {
    const movedBlocks = moveBlock(page.blocks, from, overLoc);
    if (activeBlock.layoutGroup !== overBlock.layoutGroup ||
        activeBlock.layoutCol !== overBlock.layoutCol) {
      const reStamped = movedBlocks.map((b) => {
        if (b.id !== activeId) return b;
        if (overBlock.layoutGroup != null) {
          return { ...b, layoutGroup: overBlock.layoutGroup, layoutCol: overBlock.layoutCol };
        }
        const stripped = stripLayoutStamps([b], activeId)[0];
        return stripped;
      });
      updatePage(page.id, { blocks: reStamped });
      return;
    }
    updatePage(page.id, { blocks: movedBlocks });
    return;
  }

  updatePage(page.id, { blocks: moveBlock(page.blocks, from, overLoc) });
}
