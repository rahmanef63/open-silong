"use client";

/**
 * Pages namespace — Convex adapter implementation.
 *
 * Thin reshape over `useStore()`. The store already wires the
 * Convex mutations/queries with optimistic updates, debounced text
 * writes, and flush-on-unmount — wrapping it preserves all of that
 * production tuning. Phase 4 may switch this to direct Convex calls
 * once the store can be retired; Phase 1 wraps for safety.
 *
 * SKIP-LISTED via rr-sync.json — this file never lands in rr.
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStore } from "@/shared/lib/store";
import type { Page } from "@/shared/types/domain";
import type { PagesAdapter } from "../types";

export function useConvexPagesAdapter(): PagesAdapter {
  const store = useStore();

  return useMemo<PagesAdapter>(
    () => ({
      // ── Reads ───────────────────────────────────────────────────
      useList: ({ includeTrashed }) => {
        const base = store.pages;
        if (includeTrashed) return [...base, ...store.trash];
        return base;
      },

      useOne: (pageId) => {
        // Use Convex query directly so the hook stays reactive even
        // when the store's slim list cache doesn't carry full blocks.
        const doc = useQuery(
          api.pages.getById,
          pageId ? { id: pageId } : "skip",
        );
        return doc as Page | null | undefined;
      },

      useChildren: (parentPageId) => store.childrenOf(parentPageId),

      // ── Page-level writes ───────────────────────────────────────
      create: async ({ parentId, title, icon, init }) => {
        const opts: Partial<Page> = {};
        if (title !== undefined) opts.title = title;
        if (icon !== undefined) opts.icon = icon;
        if (init) Object.assign(opts, init);
        const page = await store.createPage(parentId ?? null, opts);
        return page.id;
      },

      update: async ({ pageId, patch }) => {
        store.updatePage(pageId, patch);
      },

      trash: async (pageId) => {
        store.deletePage(pageId);
      },

      restore: async (pageId) => {
        store.restorePage(pageId);
      },

      delete: async (pageId) => {
        store.permanentlyDelete(pageId);
      },

      duplicate: async (pageId) => {
        const dup = await store.duplicatePage(pageId);
        if (!dup) throw new Error(`pages.duplicate: source page not found: ${pageId}`);
        return dup.id;
      },

      move: async ({ pageId, newParentId, newIndex }) => {
        store.movePage(pageId, newParentId);
        // newIndex is currently advisory — store.movePage appends to
        // the new parent's children. If a stable reorder is needed,
        // call reorderBlocks/reorderPages afterwards.
        void newIndex;
      },

      toggleFavorite: async (pageId) => {
        store.toggleFavorite(pageId);
      },

      // ── Block-level writes ──────────────────────────────────────
      addBlock: async ({ pageId, afterIndex, type, init }) => {
        return await store.addBlock(pageId, afterIndex, type, init);
      },

      insertBlocksAfter: async ({ pageId, afterIndex, blocks }) => {
        // Bulk insert — current store doesn't expose this directly;
        // fall back to per-block addBlock + replaceBlock so the
        // mega-slice has a working impl. Phase 2 will wire the bulk
        // Convex mutation (`api.pages.insertBlocksAfter`) when
        // editor's BlockEditor.tsx is refactored.
        const ids: string[] = [];
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          const newId = await store.addBlock(pageId, afterIndex + i, b.type, b);
          ids.push(newId);
        }
        return ids;
      },

      updateBlock: async ({ pageId, blockId, patch }) => {
        store.updateBlock(pageId, blockId, patch);
      },

      deleteBlock: async ({ pageId, blockId }) => {
        store.deleteBlock(pageId, blockId);
      },

      duplicateBlock: async ({ pageId, blockId }) => {
        const newId = store.duplicateBlock(pageId, blockId);
        return newId ?? "";
      },

      reorderBlocks: async ({ pageId, orderedIds }) => {
        store.reorderBlocks(pageId, orderedIds);
      },

      replaceBlock: async ({ pageId, blockId, nextBlock }) => {
        store.replaceBlock(pageId, blockId, nextBlock);
      },
    }),
    [store],
  );
}
