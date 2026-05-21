"use client";

/**
 * Databases namespace — localStorage adapter implementation.
 *
 * Symmetric to `pages.ts`. Database schema (properties, views, rows
 * pointer) lives in `localStorage["silong-demo:databases"]`. Row
 * VALUES live on the row page (under `rowProps[propId]`), so
 * setRowValue patches the page table — uses `getAllPages` /
 * `setAllPages` directly.
 */

import { useCallback, useMemo } from "react";
import type {
  Database, DatabaseViewConfig, DbView, Page, Property,
  PropertyType,
} from "@/shared/types/domain";
import type { DatabasesAdapter } from "../types";
import {
  DEMO_WORKSPACE_ID, genId,
  getAllDatabases, setAllDatabases,
  getAllPages, setAllPages,
  useDemoStore,
} from "./store";

function newDatabase(name: string, icon = "📊"): Database {
  const now = Date.now();
  const defaultViewId = genId("view");
  const defaultPropId = genId("prop");
  return {
    id: genId("db"),
    name,
    icon,
    properties: [{ id: defaultPropId, name: "Name", type: "text" }],
    rowIds: [],
    views: [{
      id: defaultViewId, name: "Table", type: "table",
      sorts: [], filters: [], search: "",
    }],
    activeViewId: defaultViewId,
    createdAt: now,
    updatedAt: now,
  };
}

export function useLocalStorageDatabasesAdapter(): DatabasesAdapter {
  const all = useDemoStore<Database[]>(useCallback(() => Object.values(getAllDatabases()), []));
  const pagesAll = useDemoStore<Page[]>(useCallback(() => Object.values(getAllPages()), []));
  const dbMap = useMemo(() => new Map(all.map((d) => [d.id, d])), [all]);
  const pageById = useMemo(() => new Map(pagesAll.map((p) => [p.id, p])), [pagesAll]);

  // Hot helper: rewrite ONE database atomically.
  const patchDb = useCallback((dbId: string, patch: Partial<Database>) => {
    const map = getAllDatabases();
    const existing = map[dbId];
    if (!existing) throw new Error(`databases.<patch>: not found: ${dbId}`);
    map[dbId] = { ...existing, ...patch, updatedAt: Date.now() };
    setAllDatabases(map);
  }, []);

  return useMemo<DatabasesAdapter>(
    () => ({
      useList: () => all.filter((d) => !d.trashed),

      useOne: (dbId) => {
        if (!dbId) return undefined;
        return dbMap.get(dbId) ?? null;
      },

      useRows: (dbId) => {
        const db = dbMap.get(dbId);
        if (!db) return undefined;
        return db.rowIds
          .map((rid) => pageById.get(rid))
          .filter((p): p is Page => Boolean(p));
      },

      create: async ({ name, icon }) => {
        const map = getAllDatabases();
        const db = newDatabase(name, icon);
        map[db.id] = db;
        setAllDatabases(map);
        return db.id;
      },

      update: async ({ dbId, patch }) => patchDb(dbId, patch),

      trash: async (dbId) => patchDb(dbId, { trashed: true }),
      restore: async (dbId) => patchDb(dbId, { trashed: false }),
      delete: async (dbId) => {
        const map = getAllDatabases();
        delete map[dbId];
        setAllDatabases(map);
      },

      addProperty: async ({ dbId, type, name }) => {
        const db = getAllDatabases()[dbId];
        if (!db) throw new Error(`databases.addProperty: not found: ${dbId}`);
        const id = genId("prop");
        const prop: Property = {
          id, name: name ?? type, type: type as PropertyType,
          options: (type === "select" || type === "multi_select" || type === "status") ? [] : undefined,
        };
        patchDb(dbId, { properties: [...db.properties, prop] });
        return id;
      },

      updateProperty: async ({ dbId, propId, patch }) => {
        const db = getAllDatabases()[dbId];
        if (!db) return;
        patchDb(dbId, {
          properties: db.properties.map((p) => p.id === propId ? { ...p, ...patch } : p),
        });
      },

      deleteProperty: async ({ dbId, propId }) => {
        const db = getAllDatabases()[dbId];
        if (!db) return;
        patchDb(dbId, { properties: db.properties.filter((p) => p.id !== propId) });
      },

      reorderProperties: async ({ dbId, orderedIds }) => {
        const db = getAllDatabases()[dbId];
        if (!db) return;
        const byId = new Map(db.properties.map((p) => [p.id, p]));
        patchDb(dbId, {
          properties: orderedIds.map((id) => byId.get(id)).filter((p): p is Property => Boolean(p)),
        });
      },

      addSelectOption: async ({ dbId, propId, option }) => {
        const db = getAllDatabases()[dbId];
        if (!db) throw new Error(`addSelectOption: db not found: ${dbId}`);
        const id = genId("opt");
        const properties = db.properties.map((p) =>
          p.id === propId ? { ...p, options: [...(p.options ?? []), { ...option, id }] } : p,
        );
        patchDb(dbId, { properties });
        return id;
      },

      updateSelectOption: async ({ dbId, propId, optionId, patch }) => {
        const db = getAllDatabases()[dbId];
        if (!db) return;
        const properties = db.properties.map((p) => {
          if (p.id !== propId) return p;
          return { ...p, options: (p.options ?? []).map((o) => o.id === optionId ? { ...o, ...patch } : o) };
        });
        patchDb(dbId, { properties });
      },

      deleteSelectOption: async ({ dbId, propId, optionId }) => {
        const db = getAllDatabases()[dbId];
        if (!db) return;
        const properties = db.properties.map((p) => {
          if (p.id !== propId) return p;
          return { ...p, options: (p.options ?? []).filter((o) => o.id !== optionId) };
        });
        patchDb(dbId, { properties });
      },

      addView: async ({ dbId, type, name }) => {
        const db = getAllDatabases()[dbId];
        if (!db) throw new Error(`addView: db not found: ${dbId}`);
        const id = genId("view");
        const view: DatabaseViewConfig = {
          id, name: name ?? type, type: type as DbView,
          sorts: [], filters: [], search: "",
        };
        patchDb(dbId, { views: [...db.views, view] });
        return id;
      },

      updateView: async ({ dbId, viewId, patch }) => {
        const db = getAllDatabases()[dbId];
        if (!db) return;
        patchDb(dbId, {
          views: db.views.map((v) => v.id === viewId ? { ...v, ...patch } : v),
        });
      },

      deleteView: async ({ dbId, viewId }) => {
        const db = getAllDatabases()[dbId];
        if (!db) return;
        patchDb(dbId, { views: db.views.filter((v) => v.id !== viewId) });
      },

      setActiveView: async ({ dbId, viewId }) => patchDb(dbId, { activeViewId: viewId }),

      addRow: async ({ dbId, init }) => {
        const db = getAllDatabases()[dbId];
        if (!db) throw new Error(`addRow: db not found: ${dbId}`);
        const now = Date.now();
        const rowPage: Page = {
          id: genId("page"),
          parentId: null,
          title: "",
          icon: "📄",
          cover: null,
          blocks: [],
          favorite: false,
          trashed: false,
          workspaceId: DEMO_WORKSPACE_ID,
          rowOfDatabaseId: dbId,
          rowProps: {},
          createdAt: now,
          updatedAt: now,
          ...init,
        };
        const pages = getAllPages();
        pages[rowPage.id] = rowPage;
        setAllPages(pages);
        patchDb(dbId, { rowIds: [...db.rowIds, rowPage.id] });
        return rowPage.id;
      },

      deleteRow: async ({ dbId, rowPageId }) => {
        const db = getAllDatabases()[dbId];
        if (db) patchDb(dbId, { rowIds: db.rowIds.filter((id) => id !== rowPageId) });
        const pages = getAllPages();
        delete pages[rowPageId];
        setAllPages(pages);
      },

      reorderRows: async ({ dbId, orderedIds }) => patchDb(dbId, { rowIds: orderedIds }),

      setRowValue: async ({ rowPageId, propId, value }) => {
        const pages = getAllPages();
        const row = pages[rowPageId];
        if (!row) return;
        pages[rowPageId] = {
          ...row,
          rowProps: { ...(row.rowProps ?? {}), [propId]: value },
          updatedAt: Date.now(),
        };
        setAllPages(pages);
      },

      setRelationTwoWay: async () => {
        // Demo adapter does not implement bidirectional relations.
        // Returning undefined matches the contract: "no inverse created".
        return undefined;
      },
    }),
    [all, dbMap, pageById, patchDb],
  );
}
