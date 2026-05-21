"use client";

/**
 * Local-storage NotionAdapter — skeleton.
 *
 * Phase 1 deliverable: types compile, hooks return undefined,
 * writes throw with a descriptive "not yet implemented" error so
 * any caller knows where to look.
 *
 * Phase 4 will flesh this out into the real demo backend:
 *   - JSON tree of pages keyed by id under `localStorage["silong:pages"]`
 *   - JSON tree of databases under `localStorage["silong:databases"]`
 *   - Cross-tab realtime via the `storage` event channel
 *   - `useSyncExternalStore` for live reads
 *   - Single hard-coded workspaceId ("default")
 *
 * Consumer pattern (Phase 4+):
 *
 *   import { NotionAppProvider, useLocalStorageNotionAdapter }
 *     from "@/slices/notion";
 *
 *   <NotionAppProvider adapter={useLocalStorageNotionAdapter()}>
 *     {children}
 *   </NotionAppProvider>
 *
 * Until Phase 4 lands, this returns a typed adapter where every
 * write throws and every hook returns undefined — so a consumer
 * who wires it gets clear errors instead of silent failures.
 */

import type { FilesAdapter } from "@/slices/files";
import { useLocalStorageFilesAdapter } from "@/slices/files/adapter/localStorageAdapter";
import type { NotionAdapter } from "../types";

function todo(method: string): never {
  throw new Error(
    `localStorageAdapter.${method}() — not yet implemented. ` +
      "Lift plan Phase 4 wires this. See " +
      "docs/rr-sync/2026-05-21-notion-mega-lift-plan.md#phase-4.",
  );
}

export function useLocalStorageNotionAdapter(): NotionAdapter {
  // Files adapter already exists as the proof-of-pattern lift —
  // reuse it directly.
  const files: FilesAdapter = useLocalStorageFilesAdapter();

  return {
    pages: {
      useList: () => undefined,
      useOne: () => undefined,
      useChildren: () => undefined,
      create: async () => todo("pages.create"),
      update: async () => todo("pages.update"),
      trash: async () => todo("pages.trash"),
      restore: async () => todo("pages.restore"),
      delete: async () => todo("pages.delete"),
      duplicate: async () => todo("pages.duplicate"),
      move: async () => todo("pages.move"),
      toggleFavorite: async () => todo("pages.toggleFavorite"),
      addBlock: async () => todo("pages.addBlock"),
      insertBlocksAfter: async () => todo("pages.insertBlocksAfter"),
      updateBlock: async () => todo("pages.updateBlock"),
      deleteBlock: async () => todo("pages.deleteBlock"),
      duplicateBlock: async () => todo("pages.duplicateBlock"),
      reorderBlocks: async () => todo("pages.reorderBlocks"),
      replaceBlock: async () => todo("pages.replaceBlock"),
    },
    databases: {
      useList: () => undefined,
      useOne: () => undefined,
      useRows: () => undefined,
      create: async () => todo("databases.create"),
      update: async () => todo("databases.update"),
      trash: async () => todo("databases.trash"),
      restore: async () => todo("databases.restore"),
      delete: async () => todo("databases.delete"),
      addProperty: async () => todo("databases.addProperty"),
      updateProperty: async () => todo("databases.updateProperty"),
      deleteProperty: async () => todo("databases.deleteProperty"),
      reorderProperties: async () => todo("databases.reorderProperties"),
      addSelectOption: async () => todo("databases.addSelectOption"),
      updateSelectOption: async () => todo("databases.updateSelectOption"),
      deleteSelectOption: async () => todo("databases.deleteSelectOption"),
      addView: async () => todo("databases.addView"),
      updateView: async () => todo("databases.updateView"),
      deleteView: async () => todo("databases.deleteView"),
      setActiveView: async () => todo("databases.setActiveView"),
      addRow: async () => todo("databases.addRow"),
      deleteRow: async () => todo("databases.deleteRow"),
      reorderRows: async () => todo("databases.reorderRows"),
      setRowValue: async () => todo("databases.setRowValue"),
      setRelationTwoWay: async () => todo("databases.setRelationTwoWay") as never,
    },
    files,
    // Optional namespaces intentionally omitted — consumers degrade
    // (e.g. AI button hides when `adapter.ai?.complete` is undefined).
    // Phase 4 may wire local stubs for `user` (single hard-coded
    // "demo" user) + `workspaces` (single hard-coded "default" ws).
  };
}
