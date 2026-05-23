"use client";

/**
 * Databases namespace — Convex adapter implementation.
 *
 * Thin reshape over `useStore()`. The store already wires the
 * Convex mutations + handles client-side property/view/option array
 * mutations (most database edits are patches to `database.properties[]`
 * or `database.views[]` rather than dedicated mutations).
 *
 * SKIP-LISTED via rr-sync.json — this file never lands in rr.
 */

import { useMemo } from "react";
import { useStore } from "@/shared/lib/store";
import type { Page } from "@/shared/types/domain";
import type { DatabasesAdapter } from "../types";

export function useConvexDatabasesAdapter(): DatabasesAdapter {
  const store = useStore();

  return useMemo<DatabasesAdapter>(
    () => ({
      // ── Reads ───────────────────────────────────────────────────
      useList: () => store.databases,

      useOne: (dbId) => {
        if (!dbId) return undefined;
        return store.getDatabase(dbId) ?? null;
      },

      useRows: (dbId) => {
        // Rows are pages with `rowOfDatabaseId === dbId`, ordered by
        // `db.rowIds`. Computed from the existing pages list — keeps
        // the realtime invalidation path the store already provides.
        const db = store.getDatabase(dbId);
        if (!db) return undefined;
        const pageMap = new Map<string, Page>(store.pages.map((p) => [p.id, p]));
        return db.rowIds
          .map((rid) => pageMap.get(rid))
          .filter((p): p is Page => Boolean(p));
      },

      // ── Database-level writes ───────────────────────────────────
      create: async ({ name }) => {
        const db = await store.createDatabase(name);
        return db.id;
      },

      update: async ({ dbId, patch }) => {
        store.updateDatabase(dbId, patch);
      },

      trash: async (dbId) => {
        store.trashDatabase(dbId);
      },

      restore: async (dbId) => {
        store.restoreDatabase(dbId);
      },

      delete: async (dbId) => {
        store.permanentlyDeleteDatabase(dbId);
      },

      // ── Properties ──────────────────────────────────────────────
      addProperty: async ({ dbId, type, name }) => {
        const prop = store.addProperty(dbId, type, name);
        return prop.id;
      },

      duplicateProperty: async ({ dbId, propId }) => {
        const cloned = store.duplicateProperty(dbId, propId);
        return cloned?.id ?? null;
      },

      updateProperty: async ({ dbId, propId, patch }) => {
        store.updateProperty(dbId, propId, patch);
      },

      deleteProperty: async ({ dbId, propId }) => {
        store.deleteProperty(dbId, propId);
      },

      reorderProperties: async ({ dbId, orderedIds }) => {
        store.reorderProperties(dbId, orderedIds);
      },

      // ── Select / multi-select options ───────────────────────────
      addSelectOption: async ({ dbId, propId, option }) => {
        const opt = store.addSelectOption(dbId, propId, option.name, option.color);
        return opt.id;
      },

      updateSelectOption: async ({ dbId, propId, optionId, patch }) => {
        store.updateSelectOption(dbId, propId, optionId, patch);
      },

      deleteSelectOption: async ({ dbId, propId, optionId }) => {
        store.deleteSelectOption(dbId, propId, optionId);
      },

      // ── Views ───────────────────────────────────────────────────
      addView: async ({ dbId, view }) => {
        const created = store.addView(dbId, view);
        return created.id;
      },

      updateView: async ({ dbId, viewId, patch }) => {
        store.updateView(dbId, viewId, patch);
      },

      deleteView: async ({ dbId, viewId }) => {
        store.deleteView(dbId, viewId);
      },

      setActiveView: async ({ dbId, viewId }) => {
        store.updateDatabase(dbId, { activeViewId: viewId });
      },

      // ── Rows ────────────────────────────────────────────────────
      addRow: async ({ dbId, init }) => {
        const row = await store.addRow(dbId, init);
        return row.id;
      },

      deleteRow: async ({ dbId, rowPageId }) => {
        store.deleteRow(dbId, rowPageId);
      },

      reorderRows: async ({ dbId, orderedIds }) => {
        store.reorderRows(dbId, orderedIds);
      },

      setRowValue: async ({ dbId, rowPageId, propId, value }) => {
        store.setRowValue(dbId, rowPageId, propId, value);
      },

      // ── Relations ───────────────────────────────────────────────
      setRelationTwoWay: async ({ dbId, propId, on, name }) => {
        return store.setRelationTwoWay(dbId, propId, on, name);
      },
    }),
    [store],
  );
}
