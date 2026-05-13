import type { DragEndEvent } from "@dnd-kit/core";
import type { Block, Page } from "@/shared/types/domain";
import { findLocation, moveBlock, type Location } from "./blockTree";
import { placeTopLevelGroupAtBlock, appendTopLevelGroupToContainer, topLevelIdsInOrder } from "@/slices/block-selection/lib/multiMove";

interface Deps {
  page: Page;
  updatePage: (id: string, patch: { blocks: Block[] }) => void;
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
  updatePage(page.id, { blocks: moveBlock(page.blocks, from, overLoc) });
}
