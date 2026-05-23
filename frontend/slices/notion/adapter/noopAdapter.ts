/**
 * Noop / "not configured" adapter.
 *
 * Every method throws a descriptive error pointing at the docs.
 * Returns a fully-typed `NotionAdapter` so it satisfies the
 * `<NotionAdapterProvider adapter>` prop, but any actual call
 * fails fast with a debuggable message.
 *
 * Use cases:
 *   - Storybook stories that render a sub-slice without wiring up
 *     a backend
 *   - Tests that exercise a sub-slice in isolation
 *   - Fallback when a consumer has the provider mounted but
 *     hasn't decided on a backend yet (development scaffolding)
 *
 * Production deploys should use `useConvexNotionAdapter` or
 * `useLocalStorageNotionAdapter` instead.
 */

import type { FilesAdapter } from "@/slices/files";
import type { NotionAdapter } from "./types";

function unimpl(method: string): never {
  throw new Error(
    `NotionAdapter.${method}() called on the noop adapter. ` +
      "Wire a real adapter via `<NotionAdapterProvider adapter={...}>` — " +
      "see docs/api/notion-adapter.md.",
  );
}

const filesNoop: FilesAdapter = {
  upload: async () => unimpl("files.upload"),
  remove: async () => unimpl("files.remove"),
  useUrl: () => null,
  resolveUrl: async () => null,
};

export const noopAdapter: NotionAdapter = {
  pages: {
    useList: () => undefined,
    useOne: () => undefined,
    useChildren: () => undefined,
    create: async () => unimpl("pages.create"),
    update: async () => unimpl("pages.update"),
    trash: async () => unimpl("pages.trash"),
    restore: async () => unimpl("pages.restore"),
    delete: async () => unimpl("pages.delete"),
    duplicate: async () => unimpl("pages.duplicate"),
    move: async () => unimpl("pages.move"),
    toggleFavorite: async () => unimpl("pages.toggleFavorite"),
    addBlock: async () => unimpl("pages.addBlock"),
    insertBlocksAfter: async () => unimpl("pages.insertBlocksAfter"),
    updateBlock: async () => unimpl("pages.updateBlock"),
    deleteBlock: async () => unimpl("pages.deleteBlock"),
    duplicateBlock: async () => unimpl("pages.duplicateBlock"),
    reorderBlocks: async () => unimpl("pages.reorderBlocks"),
    replaceBlock: async () => unimpl("pages.replaceBlock"),
  },
  databases: {
    useList: () => undefined,
    useOne: () => undefined,
    useRows: () => undefined,
    create: async () => unimpl("databases.create"),
    update: async () => unimpl("databases.update"),
    trash: async () => unimpl("databases.trash"),
    restore: async () => unimpl("databases.restore"),
    delete: async () => unimpl("databases.delete"),
    addProperty: async () => unimpl("databases.addProperty"),
    updateProperty: async () => unimpl("databases.updateProperty"),
    deleteProperty: async () => unimpl("databases.deleteProperty"),
    duplicateProperty: async () => unimpl("databases.duplicateProperty"),
    reorderProperties: async () => unimpl("databases.reorderProperties"),
    addSelectOption: async () => unimpl("databases.addSelectOption"),
    updateSelectOption: async () => unimpl("databases.updateSelectOption"),
    deleteSelectOption: async () => unimpl("databases.deleteSelectOption"),
    addView: async () => unimpl("databases.addView"),
    updateView: async () => unimpl("databases.updateView"),
    deleteView: async () => unimpl("databases.deleteView"),
    setActiveView: async () => unimpl("databases.setActiveView"),
    addRow: async () => unimpl("databases.addRow"),
    deleteRow: async () => unimpl("databases.deleteRow"),
    reorderRows: async () => unimpl("databases.reorderRows"),
    setRowValue: async () => unimpl("databases.setRowValue"),
    setRelationTwoWay: async () => unimpl("databases.setRelationTwoWay") as never,
  },
  files: filesNoop,
  // Optional namespaces intentionally omitted — consumers detect
  // absence via `adapter.ai?.complete` etc. and degrade gracefully.
};
