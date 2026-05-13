import { useCallback } from "react";
import type {
  Database, Property, PropertyType, SelectOption,
} from "@/shared/types/domain";
import { defaultPropName } from "@/slices/databases/lib/propertyTypeMeta";
import { uid, pickColor, type StructuralAction } from "./constants";

interface Args {
  databaseMap: Map<string, Database>;
  mutUpdateDatabase: (args: { dbId: string; patch: Partial<Database> }) => void;
  pushStructuralAction: (a: StructuralAction) => void;
}

export function usePropertyActions({ databaseMap, mutUpdateDatabase, pushStructuralAction }: Args) {
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

  return {
    addProperty, updateProperty, deleteProperty, reorderProperties,
    addSelectOption, updateSelectOption, deleteSelectOption,
  };
}
