import type {
  DatabaseViewConfig, Property, PropertyValue, SelectOption,
} from "@/shared/types/domain";
import { uid, type RemapTables } from "./types";

export function buildPropAndOptionRemap(
  properties: Property[],
): { remap: RemapTables; properties: Property[] } {
  const remap: RemapTables = {
    props: new Map(),
    options: new Map(),
    views: new Map(),
    templates: new Map(),
    rows: new Map(),
  };
  const remapped: Property[] = properties.map((p) => {
    const newId = uid();
    remap.props.set(p.id, newId);
    let options: SelectOption[] | undefined;
    if (p.options) {
      options = p.options.map((o, i) => {
        const newOptId = `${newId}_opt_${i}`;
        remap.options.set(o.id, newOptId);
        return { ...o, id: newOptId };
      });
    }
    return { ...p, id: newId, options };
  });
  return { remap, properties: remapped };
}

export function remapPropertyRefs(properties: Property[], remap: RemapTables): Property[] {
  return properties.map((p) => ({
    ...p,
    rollupRelationPropertyId: p.rollupRelationPropertyId ? remap.props.get(p.rollupRelationPropertyId) ?? p.rollupRelationPropertyId : p.rollupRelationPropertyId,
    rollupTargetPropertyId: p.rollupTargetPropertyId ? remap.props.get(p.rollupTargetPropertyId) ?? p.rollupTargetPropertyId : p.rollupTargetPropertyId,
  }));
}

export function remapViews(views: DatabaseViewConfig[], remap: RemapTables): DatabaseViewConfig[] {
  return views.map((v) => {
    const newId = uid();
    remap.views.set(v.id, newId);
    const fix = (id?: string | null): string | null | undefined =>
      id == null ? id : (remap.props.get(id) ?? id);
    const fixList = (xs?: string[]) => xs?.map((x) => remap.props.get(x) ?? x);
    return {
      ...v,
      id: newId,
      groupBy: fix(v.groupBy) ?? undefined,
      sorts: (v.sorts ?? []).map((s) => ({ ...s, propertyId: remap.props.get(s.propertyId) ?? s.propertyId })),
      filters: (v.filters ?? []).map((f) => ({ ...f, propertyId: remap.props.get(f.propertyId) ?? f.propertyId })),
      hiddenPropIds: fixList(v.hiddenPropIds),
      boardCardProps: fixList(v.boardCardProps),
      galleryCardProps: fixList(v.galleryCardProps),
      listSummaryProps: fixList(v.listSummaryProps),
      feedSummaryProps: fixList(v.feedSummaryProps),
      formRequiredProps: fixList(v.formRequiredProps),
      formShownProps: fixList(v.formShownProps),
      dashboardKPIs: fixList(v.dashboardKPIs),
      dashboardBreakdowns: fixList(v.dashboardBreakdowns),
      boardColorByProp: fix(v.boardColorByProp) ?? undefined,
      galleryCoverProp: fix(v.galleryCoverProp) ?? undefined,
      calendarDateProp: fix(v.calendarDateProp) ?? undefined,
      calendarEndProp: fix(v.calendarEndProp) ?? undefined,
      calendarColorByProp: fix(v.calendarColorByProp) ?? undefined,
      timelineStartProp: fix(v.timelineStartProp) ?? undefined,
      timelineEndProp: fix(v.timelineEndProp) ?? undefined,
      timelineColorByProp: fix(v.timelineColorByProp) ?? undefined,
      chartXProp: fix(v.chartXProp) ?? undefined,
      chartYProp: fix(v.chartYProp) ?? undefined,
      mapLatProp: fix(v.mapLatProp) ?? undefined,
      mapLngProp: fix(v.mapLngProp) ?? undefined,
      mapPinColorProp: fix(v.mapPinColorProp) ?? undefined,
    };
  });
}

export function remapRowProps(
  rowProps: Record<string, PropertyValue> | undefined,
  remap: RemapTables,
  propsByOldId: Map<string, Property>,
): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {};
  if (!rowProps) return out;
  for (const [oldPropId, val] of Object.entries(rowProps)) {
    const newPropId = remap.props.get(oldPropId);
    if (!newPropId) continue;
    const prop = propsByOldId.get(oldPropId);
    if (!prop) { out[newPropId] = val; continue; }

    if (prop.type === "select" || prop.type === "status") {
      out[newPropId] = typeof val === "string" ? remap.options.get(val) ?? val : val;
    } else if (prop.type === "multi_select") {
      out[newPropId] = Array.isArray(val) ? val.map((id) => remap.options.get(id) ?? id) : val;
    } else if (prop.type === "relation") {
      out[newPropId] = Array.isArray(val) ? val.map((id) => remap.rows.get(id) ?? id) : val;
    } else {
      out[newPropId] = val;
    }
  }
  return out;
}
