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
  const mutDuplicateWithRows = useMutation(api.databases.duplicateWithRows);

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

  /** Duplicate a database. Default = structure-only (properties + views
   *  + active-view, full id-remap). Pass `{ includeRows: true }` to
   *  also deep-copy rows server-side via the `duplicateWithRows`
   *  mutation (capped at 5000 rows). */
  const duplicateDatabase = useCallback(
    async (id: string, opts: { includeRows?: boolean } = {}): Promise<string | null> => {
      const src = databaseMap.get(id);
      if (!src) return null;
      const dbId = await mutCreateDatabase({ name: `${src.name} copy` });
      const idMap = new Map<string, string>();
      const cloneProp = (p: Property): Property => {
        const nid = uid();
        idMap.set(p.id, nid);
        return {
          ...p,
          id: nid,
          options: p.options?.map((o) => ({ ...o, id: uid() })),
          relationInversePropertyId: undefined,
        };
      };
      const properties = src.properties.map(cloneProp);
      const remapId = (x?: string | null) => (x ? idMap.get(x) ?? x : x);
      const remapList = (xs?: string[]) => xs?.map((x) => idMap.get(x) ?? x);
      const cloneView = (v: DatabaseViewConfig): DatabaseViewConfig => ({
        ...structuredClone(v),
        id: uid(),
        sorts: v.sorts.map((s) => ({ ...s, propertyId: idMap.get(s.propertyId) ?? s.propertyId })),
        filters: v.filters.map((f) => ({ ...f, propertyId: idMap.get(f.propertyId) ?? f.propertyId })),
        hiddenPropIds: remapList(v.hiddenPropIds),
        frozenPropIds: remapList(v.frozenPropIds),
        boardCardProps: remapList(v.boardCardProps),
        galleryCardProps: remapList(v.galleryCardProps),
        listSummaryProps: remapList(v.listSummaryProps),
        feedSummaryProps: remapList(v.feedSummaryProps),
        formRequiredProps: remapList(v.formRequiredProps),
        formShownProps: remapList(v.formShownProps),
        dashboardKPIs: remapList(v.dashboardKPIs),
        dashboardBreakdowns: remapList(v.dashboardBreakdowns),
        groupBy: remapId(v.groupBy ?? undefined) ?? undefined,
        boardColorByProp: remapId(v.boardColorByProp ?? undefined) ?? undefined,
        galleryCoverProp: remapId(v.galleryCoverProp ?? undefined) ?? undefined,
        calendarDateProp: remapId(v.calendarDateProp ?? undefined) ?? undefined,
        calendarEndProp: remapId(v.calendarEndProp ?? undefined) ?? undefined,
        calendarColorByProp: remapId(v.calendarColorByProp ?? undefined) ?? undefined,
        timelineStartProp: remapId(v.timelineStartProp ?? undefined) ?? undefined,
        timelineEndProp: remapId(v.timelineEndProp ?? undefined) ?? undefined,
        timelineColorByProp: remapId(v.timelineColorByProp ?? undefined) ?? undefined,
        chartXProp: remapId(v.chartXProp ?? undefined) ?? undefined,
        chartYProp: remapId(v.chartYProp ?? undefined) ?? undefined,
        mapLatProp: remapId(v.mapLatProp ?? undefined) ?? undefined,
        mapLngProp: remapId(v.mapLngProp ?? undefined) ?? undefined,
        mapPinColorProp: remapId(v.mapPinColorProp ?? undefined) ?? undefined,
      });
      const views = src.views.map(cloneView);
      const srcActiveIdx = src.views.findIndex((v) => v.id === src.activeViewId);
      const activeViewId = srcActiveIdx >= 0 ? views[srcActiveIdx].id : views[0]?.id ?? "";
      await mutUpdateDatabase({ dbId, patch: { properties, views, activeViewId } });
      if (opts.includeRows && src.rowIds.length > 0) {
        await mutDuplicateWithRows({ srcDbId: id, targetDbId: dbId });
      }
      return dbId;
    },
    [databaseMap, mutCreateDatabase, mutUpdateDatabase, mutDuplicateWithRows],
  );

  const trashDatabase = useCallback((id: string) => { mutTrashDatabase({ dbId: id }); }, [mutTrashDatabase]);
  const restoreDatabase = useCallback((id: string) => { mutRestoreDatabase({ dbId: id }); }, [mutRestoreDatabase]);
  const permanentlyDeleteDatabase = useCallback(
    (id: string) => { mutPermanentlyDeleteDatabase({ dbId: id }); },
    [mutPermanentlyDeleteDatabase],
  );

  return {
    getDatabase, createDatabase, updateDatabase, addDatabaseFromTable,
    duplicateDatabase,
    trashDatabase, restoreDatabase, permanentlyDeleteDatabase,
    mutUpdateDatabase,
  };
}
