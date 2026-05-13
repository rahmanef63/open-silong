import { useCallback } from "react";
import type { Database, DatabaseViewConfig } from "@/shared/types/domain";
import { uid } from "./constants";

interface Args {
  databaseMap: Map<string, Database>;
  mutUpdateDatabase: (args: { dbId: string; patch: Partial<Database> }) => void;
}

export function useViewActions({ databaseMap, mutUpdateDatabase }: Args) {
  const addView = useCallback(
    (dbId: string, view: Omit<DatabaseViewConfig, "id">): DatabaseViewConfig => {
      const v: DatabaseViewConfig = { ...view, id: uid() };
      const db = databaseMap.get(dbId);
      if (db) mutUpdateDatabase({ dbId, patch: { views: [...db.views, v], activeViewId: v.id } });
      return v;
    },
    [databaseMap, mutUpdateDatabase],
  );

  const updateView = useCallback(
    (dbId: string, viewId: string, patch: Partial<DatabaseViewConfig>) => {
      const db = databaseMap.get(dbId);
      if (!db) return;
      const views = db.views.map((v) => (v.id === viewId ? { ...v, ...patch } : v));
      mutUpdateDatabase({ dbId, patch: { views } });
    },
    [databaseMap, mutUpdateDatabase],
  );

  const deleteView = useCallback(
    (dbId: string, viewId: string) => {
      const db = databaseMap.get(dbId);
      if (!db) return;
      const views = db.views.filter((v) => v.id !== viewId);
      const activeViewId = db.activeViewId === viewId ? views[0]?.id ?? db.activeViewId : db.activeViewId;
      mutUpdateDatabase({ dbId, patch: { views: views.length ? views : db.views, activeViewId } });
    },
    [databaseMap, mutUpdateDatabase],
  );

  return { addView, updateView, deleteView };
}
