"use client";

/**
 * Databases-slice compat shim over NotionAdapter.
 *
 * Provides the exact same destructured names + signatures the slice
 * historically read from the legacy useStore hook, but sourced from
 * `useNotionAdapter()`. Migration accelerator for Phase 3 of the
 * notion mega-slice lift plan (docs/rr-sync/2026-05-21-notion-mega-lift-plan.md).
 *
 * Drop-in swap pattern (the bulk sed migration runs this on every file):
 *
 *   - import { useStore } from "@/shared/lib/store";
 *   + import { useDbAdapter } from "../lib/useDbAdapter";
 *
 *   - const { addRow, setRowValue, getDatabase } = useStore();
 *   + const { addRow, setRowValue, getDatabase } = useDbAdapter();
 *
 * Phase 4 cleanup: when the convex adapter no longer wraps the legacy
 * store, this shim can either be deleted (callers inline
 * `useNotionAdapter`) or kept as ergonomic sugar.
 *
 * IMPORTANT — hook rules:
 *   - `pages` + `databases` are read at the top via adapter hooks; they
 *     return arrays the caller can iterate. If `undefined` (loading),
 *     they're coerced to `[]` so callers don't have to handle the
 *     loading state for now (matches old store behaviour: store always
 *     has an array, possibly empty).
 *   - Sync lookups like `getDatabase(id)` walk the same arrays, NOT a
 *     hook each — safe to call inside callbacks / effects.
 *   - Writes return Promise (adapter contract). Most callers fire-and-
 *     forget so this is invisible. A few await; those work as before.
 */

import { useMemo } from "react";
import type {
  Block, BlockType, Database, DatabaseViewConfig, Page,
  Property, PropertyType, PropertyValue, SelectOption,
} from "@/shared/types/domain";
import { useNotionAdapter } from "@/slices/notion";

export interface DbAdapterApi {
  // ── Slice reads (always-arrays for caller ergonomics)
  pages: Page[];
  databases: Database[];
  getDatabase: (id: string) => Database | undefined;
  getPage: (id: string) => Page | undefined;
  user: { id: string; name: string; icon: string } | { id: string; name?: string; icon?: string };

  // ── Page-level writes (used by databases slice)
  addBlock: (pageId: string, afterIndex: number, type?: BlockType, init?: Partial<Block>) => Promise<string>;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => Promise<void>;
  reorderBlocks: (pageId: string, orderedIds: string[]) => Promise<void>;
  updatePage: (pageId: string, patch: Partial<Page>) => Promise<void>;

  // ── Database-level writes
  updateDatabase: (dbId: string, patch: Partial<Database>) => Promise<void>;
  trashDatabase: (dbId: string) => Promise<void>;
  duplicateDatabase: (dbId: string, opts?: { includeRows?: boolean }) => Promise<string>;

  // ── Properties
  addProperty: (dbId: string, type: PropertyType, name?: string) => Promise<{ id: string }>;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => Promise<void>;
  deleteProperty: (dbId: string, propId: string) => Promise<void>;
  duplicateProperty: (dbId: string, propId: string) => Promise<{ id: string } | null>;
  reorderProperties: (dbId: string, orderedIds: string[]) => Promise<void>;

  // ── Select options
  addSelectOption: (dbId: string, propId: string, name: string, color?: string) => Promise<{ id: string }>;
  updateSelectOption: (dbId: string, propId: string, optionId: string, patch: Partial<SelectOption>) => Promise<void>;
  deleteSelectOption: (dbId: string, propId: string, optionId: string) => Promise<void>;

  // ── Views
  addView: (dbId: string, view: Omit<DatabaseViewConfig, "id">) => Promise<{ id: string }>;
  updateView: (dbId: string, viewId: string, patch: Partial<DatabaseViewConfig>) => Promise<void>;
  deleteView: (dbId: string, viewId: string) => Promise<void>;

  // ── Rows
  addRow: (dbId: string, init?: Partial<Page>) => Promise<{ id: string }>;
  deleteRow: (dbId: string, rowPageId: string) => Promise<void>;
  reorderRows: (dbId: string, orderedIds: string[]) => Promise<void>;
  setRowValue: (dbId: string, rowPageId: string, propId: string, value: PropertyValue) => Promise<void>;

  // ── Relations
  setRelationTwoWay: (dbId: string, propId: string, on: boolean, name?: string) => Promise<string | undefined>;
}

export function useDbAdapter(): DbAdapterApi {
  const adapter = useNotionAdapter();
  // active workspace is implicit on the production Convex adapter
  // (store-wrapped). useList ignores its workspaceId arg in that
  // implementation today; passing empty string keeps the contract
  // satisfied without a workspace-resolution call.
  const pages = adapter.pages.useList({ workspaceId: "" }) ?? [];
  const databases = adapter.databases.useList({ workspaceId: "" }) ?? [];
  const user = adapter.user?.useCurrent() ?? { id: "", name: "", icon: "" };

  return useMemo<DbAdapterApi>(() => {
    const pageMap = new Map(pages.map((p) => [p.id, p]));
    const dbMap = new Map(databases.map((d) => [d.id, d]));

    return {
      pages,
      databases,
      getDatabase: (id) => dbMap.get(id),
      getPage: (id) => pageMap.get(id),
      user,

      addBlock: (pageId, afterIndex, type = "paragraph", init = {}) =>
        adapter.pages.addBlock({ pageId, afterIndex, type, init }),
      updateBlock: (pageId, blockId, patch) =>
        adapter.pages.updateBlock({ pageId, blockId, patch }),
      reorderBlocks: (pageId, orderedIds) =>
        adapter.pages.reorderBlocks({ pageId, orderedIds }),
      updatePage: (pageId, patch) =>
        adapter.pages.update({ pageId, patch }),

      updateDatabase: (dbId, patch) =>
        adapter.databases.update({ dbId, patch }),
      trashDatabase: (dbId) =>
        adapter.databases.trash(dbId),
      duplicateDatabase: async (dbId, opts) => {
        // No direct adapter method yet — fall back to fresh create
        // with copied schema. `opts.includeRows` is advisory in Phase
        // 3 (logged + ignored). Phase 4 wires a dedicated method
        // mirroring the Convex `databases.duplicateWithRows` mutation.
        void opts;
        const src = dbMap.get(dbId);
        if (!src) throw new Error(`duplicateDatabase: source not found: ${dbId}`);
        const newId = await adapter.databases.create({
          workspaceId: "",
          name: `${src.name} copy`,
          icon: src.icon,
        });
        await adapter.databases.update({ dbId: newId, patch: { properties: src.properties, views: src.views } });
        return newId;
      },

      addProperty: async (dbId, type, name) => {
        const id = await adapter.databases.addProperty({ dbId, type, name });
        return { id };
      },
      updateProperty: (dbId, propId, patch) =>
        adapter.databases.updateProperty({ dbId, propId, patch }),
      deleteProperty: (dbId, propId) =>
        adapter.databases.deleteProperty({ dbId, propId }),
      duplicateProperty: async (dbId, propId) => {
        // Single round-trip via the adapter. Earlier two-step compose
        // (addProperty + updateProperty) raced — same pattern as the
        // addView bug (a5a950d): the second call read stale databaseMap,
        // mapped over old properties, and clobbered the freshly-added
        // prop. Now the adapter clones server-side in one mutation.
        const newId = await adapter.databases.duplicateProperty({ dbId, propId });
        return newId ? { id: newId } : null;
      },
      reorderProperties: (dbId, orderedIds) =>
        adapter.databases.reorderProperties({ dbId, orderedIds }),

      addSelectOption: async (dbId, propId, name, color) => {
        const optionId = await adapter.databases.addSelectOption({
          dbId, propId, option: { id: "", name, color: color ?? "default" },
        });
        return { id: optionId };
      },
      updateSelectOption: (dbId, propId, optionId, patch) =>
        adapter.databases.updateSelectOption({ dbId, propId, optionId, patch }),
      deleteSelectOption: (dbId, propId, optionId) =>
        adapter.databases.deleteSelectOption({ dbId, propId, optionId }),

      addView: async (dbId, view) => {
        // Single round-trip — adapter.databases.addView accepts the
        // full view config. The historical two-step compose
        // (addView + updateView) raced: the second call read stale
        // databaseMap (mid-callback, no re-render yet) and clobbered
        // the new view with the old views array. Symptom: clicking
        // "+ Add view" flashed but the new view never persisted.
        const id = await adapter.databases.addView({ dbId, view });
        return { id };
      },
      updateView: (dbId, viewId, patch) =>
        adapter.databases.updateView({ dbId, viewId, patch }),
      deleteView: (dbId, viewId) =>
        adapter.databases.deleteView({ dbId, viewId }),

      addRow: async (dbId, init) => {
        const id = await adapter.databases.addRow({ dbId, init });
        return { id };
      },
      deleteRow: (dbId, rowPageId) =>
        adapter.databases.deleteRow({ dbId, rowPageId }),
      reorderRows: (dbId, orderedIds) =>
        adapter.databases.reorderRows({ dbId, orderedIds }),
      setRowValue: (dbId, rowPageId, propId, value) =>
        adapter.databases.setRowValue({ dbId, rowPageId, propId, value }),

      setRelationTwoWay: (dbId, propId, on, name) =>
        adapter.databases.setRelationTwoWay({ dbId, propId, on, name }),
    };
  }, [adapter, pages, databases, user]);
}
