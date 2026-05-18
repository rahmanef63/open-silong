import type { Block, BlockType, ColumnLayout, Page } from "@/shared/types/domain";
import { uid } from "@/shared/lib/uid";

const LEGACY_COLUMN_TYPES = new Set<BlockType>(["columns2", "columns3", "columns4", "columns5"]);

export function isLegacyColumnsBlock(block: Block): boolean {
  return LEGACY_COLUMN_TYPES.has(block.type);
}

function columnsCount(type: BlockType): number {
  if (type === "columns5") return 5;
  if (type === "columns4") return 4;
  if (type === "columns3") return 3;
  return 2;
}

const emptyParagraph = (): Block => ({ id: uid(), type: "paragraph", text: "" });

/** Walk page.blocks, virtually expand legacy `columns2..5` blocks into
 *  the new layout shape (page.layouts + per-block layoutGroup/Col).
 *
 *  Pure — does NOT mutate the input page; safe to call on every render.
 *  Subsequent writes (addBlock/updateBlock/reorderBlocks/updatePage) then
 *  persist the flattened shape; the legacy nested columns block is
 *  effectively migrated on first edit.
 */
export function adaptPageLayouts(page: Page): Page {
  const hasLegacy = page.blocks.some(isLegacyColumnsBlock);
  if (!hasLegacy) return page;

  const newBlocks: Block[] = [];
  const newLayouts: ColumnLayout[] = [...(page.layouts ?? [])];

  for (const b of page.blocks) {
    if (!isLegacyColumnsBlock(b)) {
      newBlocks.push(b);
      continue;
    }
    const count = columnsCount(b.type);
    // Reuse the legacy block id as the layout id so React keys stay
    // stable across the migration boundary.
    const layoutId = b.id;
    newLayouts.push({
      id: layoutId,
      type: "columns",
      count,
      widths: b.colWidths,
    });
    for (let c = 0; c < count; c++) {
      const children = b.columns?.[c]?.length ? b.columns[c] : [emptyParagraph()];
      for (const child of children) {
        newBlocks.push({ ...child, layoutGroup: layoutId, layoutCol: c });
      }
    }
  }

  return { ...page, blocks: newBlocks, layouts: newLayouts };
}

export interface LayoutChunk {
  kind: "layout";
  layout: ColumnLayout;
  columns: Block[][];
}
export interface BlockChunk {
  kind: "block";
  block: Block;
  index: number;
}
export type RenderChunk = LayoutChunk | BlockChunk;

/** Group the (adapted) block list into render chunks — either a
 *  standalone block or a layout group containing N columns of blocks.
 *
 *  `index` on a BlockChunk is the original index into page.blocks (used
 *  by BlockEditor for addBlock(afterIndex) addressing).
 */
export function groupBlocksIntoChunks(
  blocks: Block[],
  layouts: ColumnLayout[] | undefined,
): RenderChunk[] {
  if (!layouts?.length) {
    return blocks.map((b, i) => ({ kind: "block", block: b, index: i }));
  }
  const layoutById = new Map(layouts.map((l) => [l.id, l]));
  const chunks: RenderChunk[] = [];
  let activeGroupId: string | undefined;
  let activeColumns: Block[][] | undefined;

  const flush = () => {
    if (!activeGroupId || !activeColumns) return;
    const layout = layoutById.get(activeGroupId);
    if (layout) {
      while (activeColumns.length < layout.count) activeColumns.push([]);
      chunks.push({ kind: "layout", layout, columns: activeColumns });
    }
    activeGroupId = undefined;
    activeColumns = undefined;
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.layoutGroup && layoutById.has(b.layoutGroup)) {
      const layout = layoutById.get(b.layoutGroup)!;
      if (activeGroupId !== b.layoutGroup) {
        flush();
        activeGroupId = b.layoutGroup;
        activeColumns = Array.from({ length: layout.count }, () => []);
      }
      const col = Math.max(0, Math.min(layout.count - 1, b.layoutCol ?? 0));
      activeColumns![col].push(b);
    } else {
      flush();
      chunks.push({ kind: "block", block: b, index: i });
    }
  }
  flush();
  return chunks;
}
