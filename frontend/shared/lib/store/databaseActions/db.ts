import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type {
  Database, DatabaseViewConfig, Property, PropertyType, PropertyValue,
} from "@/shared/types/domain";
import { DEFAULT_DATABASE_ICON } from "@/shared/components/icon-picker";
import { uid } from "./constants";

interface Args {
  databaseMap: Map<string, Database>;
}

export function useDbCrud({ databaseMap }: Args) {
  const mutCreateDatabase = useMutation(api.databases.create);
  const mutUpdateDatabase = useMutation(api.databases.update);
  const mutTrashDatabase = useMutation(api.databases.trash);
  const mutRestoreDatabase = useMutation(api.databases.restore);
  const mutPermanentlyDeleteDatabase = useMutation(api.databases.permanentlyDelete);
  const mutAddRow = useMutation(api.databases.addRow);

  const getDatabase = useCallback((id: string) => databaseMap.get(id), [databaseMap]);

  const createDatabase = useCallback(
    async (name = "Untitled database"): Promise<Database> => {
      const id = await mutCreateDatabase({ name });
      const now = Date.now();
      return { id, name, icon: DEFAULT_DATABASE_ICON, properties: [], rowIds: [], views: [], activeViewId: "", createdAt: now, updatedAt: now };
    },
    [mutCreateDatabase],
  );

  const updateDatabase = useCallback(
    (id: string, patch: Partial<Database>) => { mutUpdateDatabase({ dbId: id, patch }); },
    [mutUpdateDatabase],
  );

  const addDatabaseFromTable = useCallback(
    async ({ headerRow, bodyRows }: { headerRow: string[]; bodyRows: string[][] }): Promise<string | null> => {
      const cols = headerRow.length;
      if (cols === 0) return null;
      const titleName = (headerRow[0] || "Name").trim() || "Name";
      const dbId = await mutCreateDatabase({ name: titleName });
      const titleProp: Property = { id: uid(), name: titleName, type: "text" };
      const extraProps: Property[] = headerRow.slice(1).map((h, i) => ({
        id: uid(),
        name: (h || `Column ${i + 2}`).trim() || `Column ${i + 2}`,
        type: "text" as PropertyType,
      }));
      const properties = [titleProp, ...extraProps];
      const view: DatabaseViewConfig = { id: uid(), name: "Table", type: "table", sorts: [], filters: [], search: "" };
      await mutUpdateDatabase({ dbId, patch: { properties, views: [view], activeViewId: view.id } });
      for (const row of bodyRows) {
        const rowProps: Record<string, PropertyValue> = {};
        extraProps.forEach((p, i) => { rowProps[p.id] = row[i + 1] ?? ""; });
        await mutAddRow({ dbId, init: { title: row[0] ?? "", rowProps } });
      }
      return dbId;
    },
    [mutCreateDatabase, mutUpdateDatabase, mutAddRow],
  );

  const trashDatabase = useCallback((id: string) => { mutTrashDatabase({ dbId: id }); }, [mutTrashDatabase]);
  const restoreDatabase = useCallback((id: string) => { mutRestoreDatabase({ dbId: id }); }, [mutRestoreDatabase]);
  const permanentlyDeleteDatabase = useCallback(
    (id: string) => { mutPermanentlyDeleteDatabase({ dbId: id }); },
    [mutPermanentlyDeleteDatabase],
  );

  return {
    getDatabase, createDatabase, updateDatabase, addDatabaseFromTable,
    trashDatabase, restoreDatabase, permanentlyDeleteDatabase,
    mutUpdateDatabase,
  };
}
