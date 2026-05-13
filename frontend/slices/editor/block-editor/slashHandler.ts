import type { Block, BlockType } from "@/shared/types/domain";

const uid = () => Math.random().toString(36).slice(2, 10);

interface Deps {
  pageId: string;
  block: Block;
  createPage: (parentId: string, init?: { title?: string }) => Promise<{ id: string }>;
  createDatabase: () => Promise<{ id: string }>;
  setBlockType: (pageId: string, blockId: string, type: BlockType) => void;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
}

export async function runSlashSelect(type: BlockType, deps: Deps) {
  const { pageId, block, createPage, createDatabase, setBlockType, updateBlock } = deps;
  if (type === "page") {
    const child = await createPage(pageId, { title: "New page" });
    updateBlock(pageId, block.id, { type: "page", text: "New page", pageId: child.id });
    return;
  }
  if (type === "columns2") {
    setBlockType(pageId, block.id, "columns2");
    updateBlock(pageId, block.id, {
      text: "", columns: [
        [{ id: uid(), type: "paragraph", text: "" }],
        [{ id: uid(), type: "paragraph", text: "" }],
      ],
    });
    return;
  }
  if (type === "columns3") {
    setBlockType(pageId, block.id, "columns3");
    updateBlock(pageId, block.id, {
      text: "", columns: [
        [{ id: uid(), type: "paragraph", text: "" }],
        [{ id: uid(), type: "paragraph", text: "" }],
        [{ id: uid(), type: "paragraph", text: "" }],
      ],
    });
    return;
  }
  if (type === "columns4" || type === "columns5") {
    const n = type === "columns4" ? 4 : 5;
    setBlockType(pageId, block.id, type);
    updateBlock(pageId, block.id, {
      text: "",
      columns: Array.from({ length: n }, () => [{ id: uid(), type: "paragraph" as BlockType, text: "" }]),
    });
    return;
  }
  if (type === "toggle") {
    setBlockType(pageId, block.id, "toggle");
    updateBlock(pageId, block.id, { text: "", children: [], collapsed: false });
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
