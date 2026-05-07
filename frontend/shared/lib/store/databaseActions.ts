import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type {
  Database, DatabaseViewConfig, Page, Property, PropertyType, PropertyValue, SelectOption,
} from "@/shared/types/domain";
import { applyMirrorToInverse, planRelationMirror } from "@/slices/databases/lib/relationMirror";

const uid = () => Math.random().toString(36).slice(2, 10);
const SELECT_COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
const pickColor = (i: number) => SELECT_COLORS[i % SELECT_COLORS.length];

interface Args {
  databaseMap: Map<string, Database>;
  pageMap: Map<string, Page>;
  pushStructuralAction: (a: { label: string; undo: () => void; redo: () => void }) => void;
}

export function useDatabaseActions({ databaseMap, pageMap, pushStructuralAction }: Args) {
  const mutCreateDatabase = useMutation(api.databases.create);
  const mutUpdateDatabase = useMutation(api.databases.update);
  const mutTrashDatabase = useMutation(api.databases.trash);
  const mutRestoreDatabase = useMutation(api.databases.restore);
  const mutPermanentlyDeleteDatabase = useMutation(api.databases.permanentlyDelete);
  const mutAddRow = useMutation(api.databases.addRow);
  const mutDeleteRow = useMutation(api.databases.deleteRow);
  const mutSetRowValue = useMutation(api.databases.setRowValue);

  const getDatabase = useCallback((id: string) => databaseMap.get(id), [databaseMap]);

  const createDatabase = useCallback(
    async (name = "Untitled database"): Promise<Database> => {
      const id = await mutCreateDatabase({ name });
      const now = Date.now();
      return { id, name, icon: "🗂️", properties: [], rowIds: [], views: [], activeViewId: "", createdAt: now, updatedAt: now };
    },
    [mutCreateDatabase],
  );

  const updateDatabase = useCallback(
    (id: string, patch: Partial<Database>) => {
      mutUpdateDatabase({ dbId: id, patch });
    },
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

  const addProperty = useCallback(
    (dbId: string, type: PropertyType, name?: string): Property => {
      const prop: Property = {
        id: uid(),
        name: name ?? defaultPropName(type),
        type,
        options: type === "select" || type === "multi_select" || type === "status" ? [] : undefined,
        rollupAggregate: type === "rollup" ? "count" : undefined,
        formulaExpression: type === "formula" ? "{{title}}" : undefined,
      };
      const db = databaseMap.get(dbId);
      if (db) mutUpdateDatabase({ dbId, patch: { properties: [...db.properties, prop] } });
      return prop;
    },
    [databaseMap, mutUpdateDatabase],
  );

  const updateProperty = useCallback(
    (dbId: string, propId: string, patch: Partial<Property>) => {
      const db = databaseMap.get(dbId);
      if (!db) return;
      const properties = db.properties.map((p) => (p.id === propId ? { ...p, ...patch } : p));
      mutUpdateDatabase({ dbId, patch: { properties } });
    },
    [databaseMap, mutUpdateDatabase],
  );

  const deleteProperty = useCallback(
    (dbId: string, propId: string) => {
      const db = databaseMap.get(dbId);
      if (!db) return;
      const properties = db.properties.filter((p) => p.id !== propId);
      // Cascade-strip the deleted prop from every view config so we don't
      // leave orphan ids in hiddenPropIds / sorts / filters / role props.
      const stripList = (xs?: string[]) => (xs ? xs.filter((id) => id !== propId) : xs);
      const nullIfMatch = <T extends string | undefined | null>(x: T): T | undefined =>
        x === propId ? undefined : x;
      const views = db.views.map((v) => ({
        ...v,
        hiddenPropIds: stripList(v.hiddenPropIds),
        sorts: (v.sorts ?? []).filter((s) => s.propertyId !== propId),
        filters: (v.filters ?? []).filter((f) => f.propertyId !== propId),
        boardCardProps: stripList(v.boardCardProps),
        galleryCardProps: stripList(v.galleryCardProps),
        listSummaryProps: stripList(v.listSummaryProps),
        feedSummaryProps: stripList(v.feedSummaryProps),
        formRequiredProps: stripList(v.formRequiredProps),
        formShownProps: stripList(v.formShownProps),
        dashboardKPIs: stripList(v.dashboardKPIs),
        dashboardBreakdowns: stripList(v.dashboardBreakdowns),
        groupBy: nullIfMatch(v.groupBy),
        boardColorByProp: nullIfMatch(v.boardColorByProp),
        galleryCoverProp: nullIfMatch(v.galleryCoverProp),
        calendarDateProp: nullIfMatch(v.calendarDateProp),
        calendarEndProp: nullIfMatch(v.calendarEndProp),
        calendarColorByProp: nullIfMatch(v.calendarColorByProp),
        timelineStartProp: nullIfMatch(v.timelineStartProp),
        timelineEndProp: nullIfMatch(v.timelineEndProp),
        timelineColorByProp: nullIfMatch(v.timelineColorByProp),
        chartXProp: nullIfMatch(v.chartXProp),
        chartYProp: nullIfMatch(v.chartYProp),
        mapLatProp: nullIfMatch(v.mapLatProp),
        mapLngProp: nullIfMatch(v.mapLngProp),
        mapPinColorProp: nullIfMatch(v.mapPinColorProp),
      }));
      mutUpdateDatabase({ dbId, patch: { properties, views } });
    },
    [databaseMap, mutUpdateDatabase],
  );

  const reorderProperties = useCallback(
    (dbId: string, orderedIds: string[]) => {
      const db = databaseMap.get(dbId);
      if (!db) return;
      const map = new Map(db.properties.map((p) => [p.id, p]));
      const properties = orderedIds.map((id) => map.get(id)!).filter(Boolean);
      const before = db.properties;
      const after = properties;
      const same = before.length === after.length && before.every((prop, i) => prop.id === after[i]?.id);
      if (same) return;
      pushStructuralAction({
        label: "Reorder properties",
        undo: () => mutUpdateDatabase({ dbId, patch: { properties: before } }),
        redo: () => mutUpdateDatabase({ dbId, patch: { properties: after } }),
      });
      mutUpdateDatabase({ dbId, patch: { properties } });
    },
    [databaseMap, mutUpdateDatabase, pushStructuralAction],
  );

  const addSelectOption = useCallback(
    (dbId: string, propId: string, name: string, color?: string): SelectOption => {
      const opt: SelectOption = { id: uid(), name, color: color ?? pickColor(Math.floor(Math.random() * 9)) };
      const db = databaseMap.get(dbId);
      if (db) {
        const properties = db.properties.map((p) =>
          p.id === propId ? { ...p, options: [...(p.options ?? []), opt] } : p,
        );
        mutUpdateDatabase({ dbId, patch: { properties } });
      }
      return opt;
    },
    [databaseMap, mutUpdateDatabase],
  );

  const updateSelectOption = useCallback(
    (dbId: string, propId: string, optId: string, patch: Partial<SelectOption>) => {
      const db = databaseMap.get(dbId);
      if (!db) return;
      const properties = db.properties.map((p) =>
        p.id === propId
          ? { ...p, options: (p.options ?? []).map((o) => (o.id === optId ? { ...o, ...patch } : o)) }
          : p,
      );
      mutUpdateDatabase({ dbId, patch: { properties } });
    },
    [databaseMap, mutUpdateDatabase],
  );

  const deleteSelectOption = useCallback(
    (dbId: string, propId: string, optId: string) => {
      const db = databaseMap.get(dbId);
      if (!db) return;
      const properties = db.properties.map((p) =>
        p.id === propId
          ? { ...p, options: (p.options ?? []).filter((o) => o.id !== optId) }
          : p,
      );
      mutUpdateDatabase({ dbId, patch: { properties } });
    },
    [databaseMap, mutUpdateDatabase],
  );

  const addRow = useCallback(
    async (dbId: string, init: Partial<Page> = {}, templateId?: string): Promise<Page> => {
      const rowId = await mutAddRow({ dbId, init, templateId });
      const now = Date.now();
      return { id: rowId, parentId: null, title: "", icon: "📄", cover: null, blocks: [], favorite: false, trashed: false, rowOfDatabaseId: dbId, rowProps: {}, createdAt: now, updatedAt: now };
    },
    [mutAddRow],
  );

  const deleteRow = useCallback(
    (dbId: string, rowPageId: string) => { mutDeleteRow({ dbId, rowPageId }); },
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
        undo: () => mutUpdateDatabase({ dbId, patch: { rowIds: before } }),
        redo: () => mutUpdateDatabase({ dbId, patch: { rowIds: orderedIds } }),
      });
      mutUpdateDatabase({ dbId, patch: { rowIds: orderedIds } });
    },
    [databaseMap, mutUpdateDatabase, pushStructuralAction],
  );

  /** Mirror a two-way relation change. Diffs the new vs prior value
   *  on the source row, then patches the inverse property on each
   *  added/removed target row.
   *
   *  Pure side-effect — invoked from setRowValue when the property
   *  is `relation` with `relationTwoWay`. */
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
        dbId: targetDb.id, rowPageId: targetRowId, propId: inverseProp.id,
        value: applyMirrorToInverse(target.rowProps?.[inverseProp.id], srcRowId, "add"),
      });
    }
    for (const targetRowId of removed) {
      const target = pageMap.get(targetRowId);
      if (!target) continue;
      mutSetRowValue({
        dbId: targetDb.id, rowPageId: targetRowId, propId: inverseProp.id,
        value: applyMirrorToInverse(target.rowProps?.[inverseProp.id], srcRowId, "remove"),
      });
    }
  };

  const setRowValue = useCallback(
    (dbId: string, rowPageId: string, propId: string, value: PropertyValue) => {
      mutSetRowValue({ dbId, rowPageId, propId, value });
      const db = databaseMap.get(dbId);
      const prop = db?.properties.find((p) => p.id === propId);
      if (db && prop) mirrorTwoWay(db, prop, rowPageId, value);
    },
    [mutSetRowValue, databaseMap, pageMap],
  );

  /** Toggle two-way mirroring on a relation property. Creates an
   *  inverse `relation` prop on the target db on enable; clears the
   *  inverse pointer on disable (does NOT delete the inverse prop —
   *  data is kept intact, future re-enable wires the same id back).
   *
   *  Returns the inverse prop id (newly created or existing) on
   *  enable; undefined on disable / no-op. */
  const setRelationTwoWay = useCallback(
    (dbId: string, propId: string, on: boolean, inverseName?: string): string | undefined => {
      const srcDb = databaseMap.get(dbId);
      if (!srcDb) return undefined;
      const srcProp = srcDb.properties.find((p) => p.id === propId);
      if (!srcProp || srcProp.type !== "relation") return undefined;
      if (!on) {
        // Just clear the flag — keep inversePropertyId pointer dormant
        // so re-enabling wires the same prop back.
        const properties = srcDb.properties.map((p) =>
          p.id === propId ? { ...p, relationTwoWay: false } : p,
        );
        mutUpdateDatabase({ dbId, patch: { properties } });
        return undefined;
      }
      if (!srcProp.relationDatabaseId) return undefined;
      const targetDb = databaseMap.get(srcProp.relationDatabaseId);
      if (!targetDb) return undefined;

      // Reuse existing inverse if pointer is set and target prop exists.
      let inverseId = srcProp.relationInversePropertyId;
      const existingInverse = inverseId
        ? targetDb.properties.find((p) => p.id === inverseId)
        : undefined;

      if (!existingInverse) {
        const newInverse: Property = {
          id: uid(),
          name: inverseName ?? `Related ${srcDb.name}`,
          type: "relation",
          relationDatabaseId: srcDb.id,
          relationTwoWay: true,
          relationInversePropertyId: srcProp.id,
        };
        inverseId = newInverse.id;
        mutUpdateDatabase({
          dbId: targetDb.id,
          patch: { properties: [...targetDb.properties, newInverse] },
        });
      } else if (existingInverse.relationInversePropertyId !== srcProp.id) {
        // Repair pointer drift.
        const properties = targetDb.properties.map((p) =>
          p.id === existingInverse.id
            ? { ...p, relationInversePropertyId: srcProp.id, relationTwoWay: true }
            : p,
        );
        mutUpdateDatabase({ dbId: targetDb.id, patch: { properties } });
      }

      const properties = srcDb.properties.map((p) =>
        p.id === propId
          ? { ...p, relationTwoWay: true, relationInversePropertyId: inverseId }
          : p,
      );
      mutUpdateDatabase({ dbId, patch: { properties } });
      return inverseId;
    },
    [databaseMap, mutUpdateDatabase],
  );

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

  return {
    getDatabase, createDatabase, updateDatabase, addDatabaseFromTable,
    trashDatabase, restoreDatabase, permanentlyDeleteDatabase,
    addProperty, updateProperty, deleteProperty, reorderProperties,
    addSelectOption, updateSelectOption, deleteSelectOption,
    addRow, deleteRow, reorderRows, setRowValue, setRelationTwoWay,
    addView, updateView, deleteView,
  };
}

function defaultPropName(type: PropertyType): string {
  const map: Record<PropertyType, string> = {
    text: "Text", number: "Number", select: "Select", multi_select: "Tags",
    status: "Status", date: "Date", person: "Person", checkbox: "Done",
    url: "URL", email: "Email", phone: "Phone", files: "Files",
    relation: "Relation", rollup: "Rollup", formula: "Formula",
    created_time: "Created", created_by: "Created by",
    last_edited_time: "Last edited", last_edited_by: "Last edited by",
    unique_id: "ID",
    button: "Action", place: "Place",
  };
  return map[type];
}
