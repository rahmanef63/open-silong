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
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useStore } from "@/shared/lib/store";
import type { Page } from "@/shared/types/domain";
import type { PagesAdapter } from "../types";

export function useConvexPagesAdapter(): PagesAdapter {
  const store = useStore();
  const insertBlocksAfterMutation = useMutation(api.pages.insertBlocksAfter);

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
        // Normalise from the Convex doc shape (`_id`) into the
        // adapter contract's `Page` shape (`id`) so consumers don't
        // need to know they're talking to Convex.
        const doc = useQuery(
          api.pages.getById,
          pageId ? { id: pageId } : "skip",
        );
        if (doc === undefined) return undefined;
        if (doc === null) return null;
        return {
          id: String(doc._id),
          parentId: doc.parentId,
          title: doc.title,
          icon: doc.icon,
          cover: doc.cover,
          blocks: doc.blocks ?? [],
          layouts: (doc as { layouts?: Page["layouts"] }).layouts,
          favorite: doc.favorite,
          trashed: doc.trashed,
          isPublic: doc.isPublic,
          rowOfDatabaseId: doc.rowOfDatabaseId,
          rowProps: doc.rowProps,
          font: doc.font as Page["font"],
          smallText: doc.smallText,
          fullWidth: doc.fullWidth,
          locked: doc.locked,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          databaseHostFor: doc.databaseHostFor,
          shareSlug: doc.shareSlug,
          shareIndexable: doc.shareIndexable,
          wiki: doc.wiki,
        };
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

      insertBlocksAfter: async ({ pageId, anchorBlockId, blocks, replaceAnchor }) => {
        // Direct Convex mutation — server-side splice keeps column
        // layouts + nested children consistent.
        await insertBlocksAfterMutation({
          pageId: pageId as Id<"pages">,
          anchorBlockId,
          blocks,
          ...(replaceAnchor !== undefined ? { replaceAnchor } : {}),
        });
        return blocks.map((b) => b.id);
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
