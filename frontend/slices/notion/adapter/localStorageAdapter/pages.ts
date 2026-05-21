"use client";

/**
 * Pages namespace — localStorage adapter implementation.
 *
 * All operations work against `localStorage["silong-demo:pages"]`
 * which holds a flat `{ [id]: Page }` map. Block-level mutations
 * load the page, splice/patch the blocks array, save back.
 *
 * Reactivity: every write fires `silong-demo:change`; hooks read via
 * `useDemoStore` which subscribes to that event + the native
 * `storage` event (cross-tab).
 */

import { useCallback, useMemo } from "react";
import type { Block, Page } from "@/shared/types/domain";
import type { PagesAdapter } from "../types";
import {
  DEMO_WORKSPACE_ID, genId,
  getAllPages, setAllPages,
  useDemoStore,
} from "./store";

function newPage(input: { parentId?: string | null; title?: string; icon?: string; init?: Partial<Page> }): Page {
  const now = Date.now();
  return {
    id: genId("page"),
    parentId: input.parentId ?? null,
    title: input.title ?? "",
    icon: input.icon ?? "📄",
    cover: null,
    blocks: [{ id: genId("block"), type: "paragraph", text: "" }],
    favorite: false,
    trashed: false,
    workspaceId: DEMO_WORKSPACE_ID,
    createdAt: now,
    updatedAt: now,
    ...input.init,
  };
}

export function useLocalStoragePagesAdapter(): PagesAdapter {
  // useDemoStore returns the same Map reference between unchanged
  // renders so React.memo + identity checks keep working.
  const all = useDemoStore<Page[]>(useCallback(() => Object.values(getAllPages()), []));

  const list = useMemo(() => all.filter((p) => !p.trashed), [all]);
  const listAll = all;
  const pageMap = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);

  // Hot helper: rewrite ONE page's blocks atomically.
  const patchPage = useCallback((pageId: string, patch: Partial<Page>) => {
    const map = getAllPages();
    const existing = map[pageId];
    if (!existing) throw new Error(`pages.${"<patch>"}: page not found: ${pageId}`);
    map[pageId] = { ...existing, ...patch, updatedAt: Date.now() };
    setAllPages(map);
  }, []);

  return useMemo<PagesAdapter>(
    () => ({
      useList: ({ includeTrashed } = { workspaceId: DEMO_WORKSPACE_ID }) =>
        includeTrashed ? listAll : list,

      useOne: (pageId) => {
        if (!pageId) return undefined;
        return pageMap.get(pageId) ?? null;
      },

      useChildren: (parentPageId) =>
        list.filter((p) => p.parentId === parentPageId),

      create: async ({ parentId, title, icon, init }) => {
        const map = getAllPages();
        const page = newPage({ parentId, title, icon, init });
        map[page.id] = page;
        setAllPages(map);
        return page.id;
      },

      update: async ({ pageId, patch }) => patchPage(pageId, patch),

      trash: async (pageId) => patchPage(pageId, { trashed: true }),

      restore: async (pageId) => patchPage(pageId, { trashed: false }),

      delete: async (pageId) => {
        const map = getAllPages();
        delete map[pageId];
        setAllPages(map);
      },

      duplicate: async (pageId) => {
        const map = getAllPages();
        const src = map[pageId];
        if (!src) throw new Error(`pages.duplicate: source not found: ${pageId}`);
        const clone: Page = {
          ...src,
          id: genId("page"),
          title: `${src.title} copy`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          blocks: src.blocks.map((b) => ({ ...b, id: genId("block") })),
        };
        map[clone.id] = clone;
        setAllPages(map);
        return clone.id;
      },

      move: async ({ pageId, newParentId }) =>
        patchPage(pageId, { parentId: newParentId }),

      toggleFavorite: async (pageId) => {
        const map = getAllPages();
        const cur = map[pageId];
        if (cur) patchPage(pageId, { favorite: !cur.favorite });
      },

      addBlock: async ({ pageId, afterIndex, type, init }) => {
        const map = getAllPages();
        const page = map[pageId];
        if (!page) throw new Error(`pages.addBlock: page not found: ${pageId}`);
        const block: Block = { id: genId("block"), type, text: "", ...init };
        const next = [...page.blocks];
        next.splice(afterIndex + 1, 0, block);
        patchPage(pageId, { blocks: next });
        return block.id;
      },

      insertBlocksAfter: async ({ pageId, anchorBlockId, blocks, replaceAnchor }) => {
        const map = getAllPages();
        const page = map[pageId];
        if (!page) throw new Error(`pages.insertBlocksAfter: page not found: ${pageId}`);
        const idx = page.blocks.findIndex((b) => b.id === anchorBlockId);
        if (idx === -1) throw new Error(`pages.insertBlocksAfter: anchor not found: ${anchorBlockId}`);
        const next = [...page.blocks];
        const insertAt = replaceAnchor ? idx : idx + 1;
        const removeCount = replaceAnchor ? 1 : 0;
        next.splice(insertAt, removeCount, ...blocks);
        patchPage(pageId, { blocks: next });
        return blocks.map((b) => b.id);
      },

      updateBlock: async ({ pageId, blockId, patch }) => {
        const map = getAllPages();
        const page = map[pageId];
        if (!page) return;
        const next = page.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b));
        patchPage(pageId, { blocks: next });
      },

      deleteBlock: async ({ pageId, blockId }) => {
        const map = getAllPages();
        const page = map[pageId];
        if (!page) return;
        patchPage(pageId, { blocks: page.blocks.filter((b) => b.id !== blockId) });
      },

      duplicateBlock: async ({ pageId, blockId }) => {
        const map = getAllPages();
        const page = map[pageId];
        if (!page) throw new Error(`pages.duplicateBlock: page not found: ${pageId}`);
        const idx = page.blocks.findIndex((b) => b.id === blockId);
        if (idx === -1) throw new Error(`pages.duplicateBlock: block not found: ${blockId}`);
        const src = page.blocks[idx];
        const clone: Block = { ...src, id: genId("block") };
        const next = [...page.blocks];
        next.splice(idx + 1, 0, clone);
        patchPage(pageId, { blocks: next });
        return clone.id;
      },

      reorderBlocks: async ({ pageId, orderedIds }) => {
        const map = getAllPages();
        const page = map[pageId];
        if (!page) return;
        const byId = new Map(page.blocks.map((b) => [b.id, b]));
        const next = orderedIds.map((id) => byId.get(id)).filter((b): b is Block => Boolean(b));
        patchPage(pageId, { blocks: next });
      },

      replaceBlock: async ({ pageId, blockId, nextBlock }) => {
        const map = getAllPages();
        const page = map[pageId];
        if (!page) return;
        const next = page.blocks.map((b) => (b.id === blockId ? nextBlock : b));
        patchPage(pageId, { blocks: next });
      },
    }),
    [list, listAll, pageMap, patchPage],
  );
}
