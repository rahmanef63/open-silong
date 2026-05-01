import type { Block } from "@/shared/types/domain";

export type Location =
  | { kind: "top"; index: number }
  | { kind: "col"; containerId: string; colIndex: number; index: number }
  | { kind: "toggle"; containerId: string; index: number };

/** Find where a block lives in the page's block tree. Searches top-level + columns + toggle children. */
export function findLocation(blocks: Block[], id: string): Location | null {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.id === id) return { kind: "top", index: i };
    if ((b.type === "columns2" || b.type === "columns3") && b.columns) {
      for (let c = 0; c < b.columns.length; c++) {
        const idx = b.columns[c].findIndex((x) => x.id === id);
        if (idx !== -1) return { kind: "col", containerId: b.id, colIndex: c, index: idx };
      }
    }
    if (b.type === "toggle" && b.children) {
      const idx = b.children.findIndex((x) => x.id === id);
      if (idx !== -1) return { kind: "toggle", containerId: b.id, index: idx };
    }
  }
  return null;
}

/** Return [removed-block, new-tree] for the block at `loc`. */
export function removeAt(blocks: Block[], loc: Location): { removed: Block; blocks: Block[] } {
  if (loc.kind === "top") {
    const removed = blocks[loc.index];
    return { removed, blocks: blocks.filter((_, i) => i !== loc.index) };
  }
  if (loc.kind === "col") {
    let removed!: Block;
    const next = blocks.map((b) => {
      if (b.id !== loc.containerId) return b;
      const cols = (b.columns ?? []).map((col, c) => {
        if (c !== loc.colIndex) return col;
        removed = col[loc.index];
        return col.filter((_, i) => i !== loc.index);
      });
      return { ...b, columns: cols };
    });
    return { removed, blocks: next };
  }
  // toggle
  let removed!: Block;
  const next = blocks.map((b) => {
    if (b.id !== loc.containerId) return b;
    const ch = b.children ?? [];
    removed = ch[loc.index];
    return { ...b, children: ch.filter((_, i) => i !== loc.index) };
  });
  return { removed, blocks: next };
}

/** Insert block at `loc` (loc.index is the desired position). */
export function insertAt(blocks: Block[], loc: Location, insert: Block): Block[] {
  if (loc.kind === "top") {
    const next = [...blocks];
    next.splice(loc.index, 0, insert);
    return next;
  }
  if (loc.kind === "col") {
    return blocks.map((b) => {
      if (b.id !== loc.containerId) return b;
      const cols = (b.columns ?? []).map((col, c) => {
        if (c !== loc.colIndex) return col;
        const nc = [...col];
        nc.splice(loc.index, 0, insert);
        return nc;
      });
      return { ...b, columns: cols };
    });
  }
  // toggle
  return blocks.map((b) => {
    if (b.id !== loc.containerId) return b;
    const ch = [...(b.children ?? [])];
    ch.splice(loc.index, 0, insert);
    return { ...b, children: ch, collapsed: false };
  });
}

/** Move a block from one tree location to another.
 *  Mirrors dnd-kit `arrayMove`: `to.index` is interpreted in the original array;
 *  splice-after-remove yields the correct result without index adjustment. */
export function moveBlock(blocks: Block[], from: Location, to: Location): Block[] {
  const { removed, blocks: afterRemove } = removeAt(blocks, from);
  return insertAt(afterRemove, to, removed);
}
