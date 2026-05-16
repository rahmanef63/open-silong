import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type {
  Database, Page, Property, PropertyValue,
} from "@/shared/types/domain";
import { applyMirrorToInverse, planRelationMirror } from "@/shared/lib/databases/relationMirror";
import { DEFAULT_ROW_ICON } from "@/shared/components/icon-picker";
import { type StructuralAction } from "./constants";

/** Boundary casts — frontend ids are `string`; Convex requires branded
 *  table-prefixed `Id<TABLE>`. */
const asDbId = (s: string): Id<"databases"> => s as Id<"databases">;
const asPageId = (s: string): Id<"pages"> => s as Id<"pages">;

interface Args {
  databaseMap: Map<string, Database>;
  pageMap: Map<string, Page>;
  mutUpdateDatabase: (args: { dbId: Id<"databases">; patch: Partial<Database> }) => void;
  pushStructuralAction: (a: StructuralAction) => void;
}

export function useRowActions({ databaseMap, pageMap, mutUpdateDatabase, pushStructuralAction }: Args) {
  const mutAddRow = useMutation(api.databases.addRow);
  const mutDeleteRow = useMutation(api.databases.deleteRow);
  const mutSetRowValue = useMutation(api.databases.setRowValue);

  const addRow = useCallback(
    async (dbId: string, init: Partial<Page> = {}, templateId?: string): Promise<Page> => {
      const rowId = await mutAddRow({ dbId: asDbId(dbId), init, templateId });
      const now = Date.now();
      return { id: rowId, parentId: null, title: "", icon: DEFAULT_ROW_ICON, cover: null, blocks: [], favorite: false, trashed: false, rowOfDatabaseId: dbId, rowProps: {}, createdAt: now, updatedAt: now };
    },
    [mutAddRow],
  );

  const deleteRow = useCallback(
    (dbId: string, rowPageId: string) => { mutDeleteRow({ dbId: asDbId(dbId), rowPageId: asPageId(rowPageId) }); },
    [mutDeleteRow],
  );

  const reorderRows = useCallback(
    (dbId: string, orderedIds: string[]) => {
      const db = databaseMap.get(dbId);
      if (!db) return;
      const before = db.rowIds;
      const same = before.length === orderedIds.length && before.every((id, i) => id === orderedIds[i]);
      if (same) return;
      pushStructuralAction({
        label: "Reorder rows",
        undo: () => mutUpdateDatabase({ dbId: asDbId(dbId), patch: { rowIds: before } }),
        redo: () => mutUpdateDatabase({ dbId: asDbId(dbId), patch: { rowIds: orderedIds } }),
      });
      mutUpdateDatabase({ dbId: asDbId(dbId), patch: { rowIds: orderedIds } });
    },
    [databaseMap, mutUpdateDatabase, pushStructuralAction],
  );

  /** Mirror a two-way relation change. Diffs the new vs prior value
   *  on the source row, then patches the inverse property on each
   *  added/removed target row. */
  const mirrorTwoWay = (
    db: Database, prop: Property, srcRowId: string, nextValue: PropertyValue,
  ) => {
    if (prop.type !== "relation" || !prop.relationTwoWay) return;
    if (!prop.relationDatabaseId || !prop.relationInversePropertyId) return;
    const targetDb = databaseMap.get(prop.relationDatabaseId);
    if (!targetDb) return;
    const inverseProp = targetDb.properties.find(
      (p) => p.id === prop.relationInversePropertyId,
    );
    if (!inverseProp) return;

    const srcRow = pageMap.get(srcRowId);
    const { added, removed } = planRelationMirror({
      srcRowId,
      prior: srcRow?.rowProps?.[prop.id],
      next: nextValue,
    });
    for (const targetRowId of added) {
      const target = pageMap.get(targetRowId);
      if (!target) continue;
      mutSetRowValue({
        dbId: asDbId(targetDb.id), rowPageId: asPageId(targetRowId), propId: inverseProp.id,
        value: applyMirrorToInverse(target.rowProps?.[inverseProp.id], srcRowId, "add"),
      });
    }
    for (const targetRowId of removed) {
      const target = pageMap.get(targetRowId);
      if (!target) continue;
      mutSetRowValue({
        dbId: asDbId(targetDb.id), rowPageId: asPageId(targetRowId), propId: inverseProp.id,
        value: applyMirrorToInverse(target.rowProps?.[inverseProp.id], srcRowId, "remove"),
      });
    }
  };

  const setRowValue = useCallback(
    (dbId: string, rowPageId: string, propId: string, value: PropertyValue) => {
      mutSetRowValue({ dbId: asDbId(dbId), rowPageId: asPageId(rowPageId), propId, value });
      const db = databaseMap.get(dbId);
      const prop = db?.properties.find((p) => p.id === propId);
      if (db && prop) mirrorTwoWay(db, prop, rowPageId, value);
    },
    [mutSetRowValue, databaseMap, pageMap],
  );

  return { addRow, deleteRow, reorderRows, setRowValue };
}
