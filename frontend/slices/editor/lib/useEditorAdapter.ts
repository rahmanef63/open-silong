"use client";

/**
 * Editor-slice compat shim over NotionAdapter.
 *
 * Mirror of useDbAdapter from frontend/slices/databases — exposes the
 * destructured names the editor historically read from useStore() but
 * sourced from useNotionAdapter(). Lets the editor slice typecheck
 * inside rr without dragging Convex through @/shared/lib/store.
 *
 * Phase 6 of the notion mega-lift plan
 * (docs/rr-sync/2026-05-21-notion-mega-lift-plan.md).
 *
 * Drop-in swap pattern:
 *
 *   - import { useStore } from "@/shared/lib/store";
 *   + import { useEditorAdapter } from "../lib/useEditorAdapter";
 *
 *   - const { addBlock, updateBlock, getPage } = useStore();
 *   + const { addBlock, updateBlock, getPage } = useEditorAdapter();
 *
 * Signature notes — kept compatible with the legacy useStore shape:
 *   - addBlock signature is positional (pageId, afterIndex, type?, init?)
 *     not the adapter's object-arg form.
 *   - getPage / getDatabase are sync map-lookups over the reactive arrays.
 *   - createPage / duplicatePage return { id } (not the full Page) — the
 *     caller only needs the id for navigation. Two call sites updated.
 *   - saving is a hardcoded false (the adapter doesn't surface a saving
 *     flag; UI defaults to "Saved").
 */

import { useMemo } from "react";
import type {
  Block, BlockType, Database, Page,
  Property, PropertyType, UserProfile, Workspace,
} from "@/shared/types/domain";
import { useNotionAdapter } from "@/slices/notion";

const DEFAULT_USER: UserProfile = {
  id: "",
  name: "",
  icon: "",
  email: "",
  bio: "",
  color: "",
};

export interface EditorAdapterApi {
  // ── Reads (always-arrays for caller ergonomics)
  pages: Page[];
  databases: Database[];
  user: UserProfile;
  workspace: Workspace | null;
  saving: boolean;

  // ── Sync lookups
  getPage: (id: string) => Page | undefined;
  getDatabase: (id: string) => Database | undefined;
  childrenOf: (parentId: string | null) => Page[];

  // ── Page-level writes
  updatePage: (pageId: string, patch: Partial<Page>) => Promise<void>;
  updateDatabase: (dbId: string, patch: Partial<Database>) => Promise<void>;
  createPage: (parentId?: string | null, opts?: Partial<Page>) => Promise<{ id: string }>;
  duplicatePage: (id: string) => Promise<{ id: string } | null>;
  deletePage: (id: string) => Promise<void>;
  movePage: (id: string, newParentId: string | null) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  pushRecent: (id: string) => Promise<void>;

  // ── Block-level writes
  addBlock: (pageId: string, afterIndex: number, type?: BlockType, init?: Partial<Block>) => Promise<string>;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => Promise<void>;
  deleteBlock: (pageId: string, blockId: string) => Promise<void>;
  duplicateBlock: (pageId: string, blockId: string) => Promise<string>;
  reorderBlocks: (pageId: string, orderedIds: string[]) => Promise<void>;
  setBlockType: (pageId: string, blockId: string, type: BlockType) => Promise<void>;
  replaceBlock: (pageId: string, blockId: string, nextBlock: Block) => Promise<void>;

  // ── Database-level writes (subset used by editor)
  createDatabase: (name?: string) => Promise<{ id: string }>;

  // ── Property writes (used by RowPropertiesPanel + PropertyNameCell)
  addProperty: (dbId: string, type: PropertyType, name?: string) => Promise<{ id: string }>;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => Promise<void>;
  deleteProperty: (dbId: string, propId: string) => Promise<void>;
}

/** Writers-only subset of the editor adapter. Stable across
 *  pages/databases data changes — deps reduce to `[adapter, workspace]`.
 *  Use this in hot components (BlockEditor, every block in a 200-block
 *  page) so typing into one block does NOT invalidate the API object
 *  on every Convex realtime tick. The full `useEditorAdapter()` is
 *  fine for surfaces that already need the reads (PageEditor,
 *  PageRefBlock title lookup). */
export interface EditorWritersApi {
  updatePage: EditorAdapterApi["updatePage"];
  updateDatabase: EditorAdapterApi["updateDatabase"];
  createPage: EditorAdapterApi["createPage"];
  duplicatePage: EditorAdapterApi["duplicatePage"];
  deletePage: EditorAdapterApi["deletePage"];
  movePage: EditorAdapterApi["movePage"];
  toggleFavorite: EditorAdapterApi["toggleFavorite"];
  pushRecent: EditorAdapterApi["pushRecent"];
  addBlock: EditorAdapterApi["addBlock"];
  updateBlock: EditorAdapterApi["updateBlock"];
  deleteBlock: EditorAdapterApi["deleteBlock"];
  duplicateBlock: EditorAdapterApi["duplicateBlock"];
  reorderBlocks: EditorAdapterApi["reorderBlocks"];
  setBlockType: EditorAdapterApi["setBlockType"];
  replaceBlock: EditorAdapterApi["replaceBlock"];
  createDatabase: EditorAdapterApi["createDatabase"];
  addProperty: EditorAdapterApi["addProperty"];
  updateProperty: EditorAdapterApi["updateProperty"];
  deleteProperty: EditorAdapterApi["deleteProperty"];
}

export function useEditorWriters(): EditorWritersApi {
  const adapter = useNotionAdapter();
  const workspace = adapter.workspaces?.useActive() ?? null;
  return useMemo<EditorWritersApi>(() => ({
    updatePage: (pageId, patch) => adapter.pages.update({ pageId, patch }),
    updateDatabase: (dbId, patch) => adapter.databases.update({ dbId, patch }),
    createPage: async (parentId, opts) => {
      const id = await adapter.pages.create({
        workspaceId: workspace?.id ?? "",
        parentId: parentId ?? null,
        title: opts?.title, icon: opts?.icon, init: opts,
      });
      return { id };
    },
    duplicatePage: async (id) => {
      try { return { id: await adapter.pages.duplicate(id) }; } catch { return null; }
    },
    deletePage: (id) => adapter.pages.trash(id),
    movePage: (id, newParentId) => adapter.pages.move({ pageId: id, newParentId }),
    toggleFavorite: (id) => adapter.pages.toggleFavorite(id),
    pushRecent: async (id) => { await adapter.recents?.push({ targetType: "page", targetId: id }); },
    addBlock: (pageId, afterIndex, type = "paragraph", init = {}) =>
      adapter.pages.addBlock({ pageId, afterIndex, type, init }),
    updateBlock: (pageId, blockId, patch) =>
      adapter.pages.updateBlock({ pageId, blockId, patch }),
    deleteBlock: (pageId, blockId) =>
      adapter.pages.deleteBlock({ pageId, blockId }),
    duplicateBlock: (pageId, blockId) =>
      adapter.pages.duplicateBlock({ pageId, blockId }),
    reorderBlocks: (pageId, orderedIds) =>
      adapter.pages.reorderBlocks({ pageId, orderedIds }),
    setBlockType: (pageId, blockId, type) =>
      adapter.pages.updateBlock({ pageId, blockId, patch: { type } }),
    replaceBlock: (pageId, blockId, nextBlock) =>
      adapter.pages.replaceBlock({ pageId, blockId, nextBlock }),
    createDatabase: async (name) => {
      const id = await adapter.databases.create({
        workspaceId: workspace?.id ?? "", name: name ?? "Untitled",
      });
      return { id };
    },
    addProperty: async (dbId, type, name) => {
      const id = await adapter.databases.addProperty({ dbId, type, name });
      return { id };
    },
    updateProperty: (dbId, propId, patch) =>
      adapter.databases.updateProperty({ dbId, propId, patch }),
    deleteProperty: (dbId, propId) =>
      adapter.databases.deleteProperty({ dbId, propId }),
  }), [adapter, workspace]);
}

export function useEditorAdapter(): EditorAdapterApi {
  const adapter = useNotionAdapter();
  const pages = adapter.pages.useList({ workspaceId: "" }) ?? [];
  const databases = adapter.databases.useList({ workspaceId: "" }) ?? [];
  const user = adapter.user?.useCurrent() ?? DEFAULT_USER;
  const workspace = adapter.workspaces?.useActive() ?? null;

  return useMemo<EditorAdapterApi>(() => {
    const pageMap = new Map(pages.map((p) => [p.id, p]));
    const dbMap = new Map(databases.map((d) => [d.id, d]));
    const childrenIndex = new Map<string | null, Page[]>();
    for (const p of pages) {
      if (p.trashed) continue;
      const k = p.parentId ?? null;
      const list = childrenIndex.get(k);
      if (list) list.push(p);
      else childrenIndex.set(k, [p]);
    }

    return {
      pages,
      databases,
      user: user as UserProfile,
      workspace: workspace as Workspace | null,
      saving: false,

      getPage: (id) => pageMap.get(id),
      getDatabase: (id) => dbMap.get(id),
      childrenOf: (parentId) => childrenIndex.get(parentId) ?? [],

      updatePage: (pageId, patch) => adapter.pages.update({ pageId, patch }),
      updateDatabase: (dbId, patch) => adapter.databases.update({ dbId, patch }),
      createPage: async (parentId, opts) => {
        const id = await adapter.pages.create({
          workspaceId: workspace?.id ?? "",
          parentId: parentId ?? null,
          title: opts?.title,
          icon: opts?.icon,
          init: opts,
        });
        return { id };
      },
      duplicatePage: async (id) => {
        try {
          const newId = await adapter.pages.duplicate(id);
          return { id: newId };
        } catch {
          return null;
        }
      },
      deletePage: (id) => adapter.pages.trash(id),
      movePage: (id, newParentId) => adapter.pages.move({ pageId: id, newParentId }),
      toggleFavorite: (id) => adapter.pages.toggleFavorite(id),
      pushRecent: async (id) => {
        await adapter.recents?.push({ targetType: "page", targetId: id });
      },

      addBlock: (pageId, afterIndex, type = "paragraph", init = {}) =>
        adapter.pages.addBlock({ pageId, afterIndex, type, init }),
      updateBlock: (pageId, blockId, patch) =>
        adapter.pages.updateBlock({ pageId, blockId, patch }),
      deleteBlock: (pageId, blockId) =>
        adapter.pages.deleteBlock({ pageId, blockId }),
      duplicateBlock: (pageId, blockId) =>
        adapter.pages.duplicateBlock({ pageId, blockId }),
      reorderBlocks: (pageId, orderedIds) =>
        adapter.pages.reorderBlocks({ pageId, orderedIds }),
      setBlockType: (pageId, blockId, type) =>
        adapter.pages.updateBlock({ pageId, blockId, patch: { type } }),
      replaceBlock: (pageId, blockId, nextBlock) =>
        adapter.pages.replaceBlock({ pageId, blockId, nextBlock }),

      createDatabase: async (name) => {
        const id = await adapter.databases.create({
          workspaceId: workspace?.id ?? "",
          name: name ?? "Untitled",
        });
        return { id };
      },

      addProperty: async (dbId, type, name) => {
        const id = await adapter.databases.addProperty({ dbId, type, name });
        return { id };
      },
      updateProperty: (dbId, propId, patch) =>
        adapter.databases.updateProperty({ dbId, propId, patch }),
      deleteProperty: (dbId, propId) =>
        adapter.databases.deleteProperty({ dbId, propId }),
    };
  }, [adapter, pages, databases, user, workspace]);
}
