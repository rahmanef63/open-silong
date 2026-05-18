import type { Block, BlockType, ColumnLayout, Page } from "@/shared/types/domain";
import { uid } from "@/shared/lib/uid";

interface Deps {
  pageId: string;
  block: Block;
  createPage: (parentId: string, init?: { title?: string }) => Promise<{ id: string }>;
  createDatabase: () => Promise<{ id: string }>;
  setBlockType: (pageId: string, blockId: string, type: BlockType) => void;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
  /** Required for "columns2..5" slash actions which switched from a
   *  single block-type swap to a layout-primitive insertion. */
  addBlock?: (pageId: string, afterIndex: number, type?: BlockType, init?: Partial<Block>) => Promise<string>;
  updatePage?: (pageId: string, patch: Partial<Page>) => void;
  getPage?: (pageId: string) => Page | undefined;
}

const COLUMNS_TYPES = new Set<BlockType>(["columns2", "columns3", "columns4", "columns5"]);
function columnsCount(type: BlockType): number {
  if (type === "columns5") return 5;
  if (type === "columns4") return 4;
  if (type === "columns3") return 3;
  return 2;
}

export async function runSlashSelect(type: BlockType, deps: Deps) {
  const { pageId, block, createPage, createDatabase, setBlockType, updateBlock, addBlock, updatePage, getPage } = deps;
  if (type === "page") {
    const child = await createPage(pageId, { title: "New page" });
    updateBlock(pageId, block.id, { type: "page", text: "New page", pageId: child.id });
    return;
  }
  if (COLUMNS_TYPES.has(type)) {
    const n = columnsCount(type);
    const layoutId = uid();
    const newLayout: ColumnLayout = { id: layoutId, type: "columns", count: n };

    // Single atomic updatePage write — eliminates the race window from
    // chaining setBlockType + updateBlock + N×addBlock, and avoids
    // stale-afterIndex ordering bugs when convex serializes splices.
    if (updatePage && getPage) {
      const page = getPage(pageId);
      if (page) {
        const idx = page.blocks.findIndex((b) => b.id === block.id);
        const insertAt = idx >= 0 ? idx : page.blocks.length - 1;
        const before = page.blocks.slice(0, insertAt);
        const after = page.blocks.slice(insertAt + 1);
        const newCol0: Block = {
          ...block, text: "", type: "paragraph",
          layoutGroup: layoutId, layoutCol: 0,
        };
        const siblings: Block[] = Array.from({ length: n - 1 }, (_, i) => ({
          id: uid(),
          type: "paragraph",
          text: "",
          layoutGroup: layoutId,
          layoutCol: i + 1,
        }));
        const blocks = [...before, newCol0, ...siblings, ...after];
        const layouts = [...(page.layouts ?? []), newLayout];
        updatePage(pageId, { blocks, layouts });
        return;
      }
    }
    // Fallback path if updatePage/getPage missing — still functional
    // but lossy in edge cases.
    setBlockType(pageId, block.id, "paragraph");
    updateBlock(pageId, block.id, { text: "", layoutGroup: layoutId, layoutCol: 0 });
    return;
  }
  if (type === "toggle") {
    setBlockType(pageId, block.id, "toggle");
    updateBlock(pageId, block.id, { text: "", children: [], collapsed: false });
    return;
  }
  if (type === "synced") {
    setBlockType(pageId, block.id, "synced");
    updateBlock(pageId, block.id, { text: "", children: [], syncId: uid() });
    return;
  }
  if (type === "database") {
    const db = await createDatabase();
    setBlockType(pageId, block.id, "database");
    updateBlock(pageId, block.id, { text: "", databaseId: db.id });
    return;
  }
  setBlockType(pageId, block.id, type);
  updateBlock(pageId, block.id, { text: "" });
  setTimeout(() => {
    const el2 = document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
    el2?.focus();
    if (el2) el2.innerText = "";
  }, 0);
}
