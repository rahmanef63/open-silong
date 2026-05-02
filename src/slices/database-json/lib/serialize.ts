import type {
  Block, Database, DatabaseTemplate, DatabaseViewConfig, Page, Property, PropertyValue, SelectOption,
} from "@/shared/types/domain";

/* ============================================================
 * Wire format (versioned)
 * ============================================================ */

export interface DatabaseExportV1 {
  version: 1;
  exportedAt: string;
  database: {
    name: string;
    icon: string;
    properties: Property[];
    views: DatabaseViewConfig[];
    activeViewId?: string;
    templates?: DatabaseTemplate[];
    defaultTemplateId?: string | null;
    subItemsParentPropId?: string | null;
    uniqueIdCounter?: number;
  };
  rows: RowExport[];
}

export interface RowExport {
  title: string;
  icon: string;
  cover?: string | null;
  blocks?: Block[];
  rowProps?: Record<string, PropertyValue>;
  favorite?: boolean;
  isPublic?: boolean;
}

/* ============================================================
 * Export
 * ============================================================ */

export function exportDatabase(db: Database, rows: Page[]): DatabaseExportV1 {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    database: {
      name: db.name,
      icon: db.icon,
      properties: db.properties.map(stripUndefined),
      views: db.views.map(stripUndefined),
      activeViewId: db.activeViewId,
      templates: db.templates,
      defaultTemplateId: db.defaultTemplateId,
      subItemsParentPropId: db.subItemsParentPropId,
      uniqueIdCounter: db.uniqueIdCounter,
    },
    rows: rows.map((r) => ({
      title: r.title,
      icon: r.icon,
      cover: r.cover ?? null,
      blocks: r.blocks ?? [],
      rowProps: r.rowProps ?? {},
      favorite: r.favorite,
      isPublic: r.isPublic,
    })),
  };
}

function stripUndefined<T extends object>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
 * Validate
 * ============================================================ */

export function parseExport(raw: string): DatabaseExportV1 {
  const j = JSON.parse(raw);
  if (j?.version !== 1 || !j?.database || !Array.isArray(j?.rows)) {
    throw new Error("Not a valid database export (missing version 1 / database / rows).");
  }
  if (!Array.isArray(j.database.properties) || !Array.isArray(j.database.views)) {
    throw new Error("Database is missing properties[] or views[].");
  }
  return j as DatabaseExportV1;
}

/* ============================================================
 * Apply (id-remapping import)
 * ============================================================ */

const uid = () => Math.random().toString(36).slice(2, 10);

interface RemapTables {
  props: Map<string, string>;
  options: Map<string, string>;
  views: Map<string, string>;
  templates: Map<string, string>;
  rows: Map<string, string>; // original row id (if present in JSON's rowProps relation values) → new id
}

function buildPropAndOptionRemap(properties: Property[]): { remap: RemapTables; properties: Property[] } {
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

function remapPropertyRefs(properties: Property[], remap: RemapTables): Property[] {
  return properties.map((p) => ({
    ...p,
    rollupRelationPropertyId: p.rollupRelationPropertyId ? remap.props.get(p.rollupRelationPropertyId) ?? p.rollupRelationPropertyId : p.rollupRelationPropertyId,
    rollupTargetPropertyId: p.rollupTargetPropertyId ? remap.props.get(p.rollupTargetPropertyId) ?? p.rollupTargetPropertyId : p.rollupTargetPropertyId,
  }));
}

function remapViews(views: DatabaseViewConfig[], remap: RemapTables): DatabaseViewConfig[] {
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

function remapRowProps(
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
      // Rows from this same export get remapped; foreign relation ids pass through.
      out[newPropId] = Array.isArray(val) ? val.map((id) => remap.rows.get(id) ?? id) : val;
    } else {
      out[newPropId] = val;
    }
  }
  return out;
}

/** Apply an export to the running store. Creates a new database + rows and
 *  returns the new database id. Two passes for relation ids: pass 1 creates
 *  the database + each row (capturing old→new row-id remap), pass 2 writes
 *  rowProps now that all row ids are known. */
export async function applyImport(
  json: DatabaseExportV1,
  store: {
    createDatabase: (name?: string) => Promise<Database>;
    updateDatabase: (id: string, patch: Partial<Database>) => void;
    addRow: (dbId: string, init?: Partial<Page>) => Promise<Page>;
    setRowValue: (dbId: string, rowPageId: string, propId: string, value: PropertyValue) => void;
    updatePage: (id: string, patch: Partial<Page>) => void;
  },
): Promise<{ dbId: string }> {
  // 1) Property + option remap
  const { remap, properties: remappedProps } = buildPropAndOptionRemap(json.database.properties);
  const propsByOldId = new Map<string, Property>();
  for (const p of json.database.properties) propsByOldId.set(p.id, p);

  // 2) Self-references inside properties (rollup → relation/target)
  const propsWithRefs = remapPropertyRefs(remappedProps, remap);

  // 3) Views remap
  const remappedViews = remapViews(json.database.views, remap);
  const newActiveView = json.database.activeViewId
    ? (remap.views.get(json.database.activeViewId) ?? remappedViews[0]?.id ?? "")
    : remappedViews[0]?.id ?? "";

  // 4) Templates remap (best-effort — keeps existing rowProps refs aligned)
  const remappedTemplates = (json.database.templates ?? []).map((t) => {
    const newTplId = uid();
    remap.templates.set(t.id, newTplId);
    return {
      ...t,
      id: newTplId,
      rowProps: remapRowProps(t.rowProps, remap, propsByOldId),
    };
  });

  // 5) Create DB shell + commit schema
  const created = await store.createDatabase(json.database.name || "Imported");
  store.updateDatabase(created.id, {
    name: json.database.name,
    icon: json.database.icon,
    properties: propsWithRefs,
    views: remappedViews,
    activeViewId: newActiveView,
    templates: remappedTemplates,
    defaultTemplateId: json.database.defaultTemplateId
      ? (remap.templates.get(json.database.defaultTemplateId) ?? null)
      : null,
    subItemsParentPropId: json.database.subItemsParentPropId
      ? (remap.props.get(json.database.subItemsParentPropId) ?? null)
      : null,
    uniqueIdCounter: json.database.uniqueIdCounter,
  });

  // 6) Pass 1 — create each row, capturing old-id → new-id (if export
  // included an `id` field; otherwise rows are anonymous). We don't expose
  // ids in RowExport but consumers MAY add them.
  const rowsWithIds: Array<RowExport & { id?: string }> = json.rows;
  const createdPages: Page[] = [];
  for (const r of rowsWithIds) {
    const newRow = await store.addRow(created.id, {
      title: r.title || "",
      icon: r.icon || "📄",
      cover: r.cover,
      blocks: r.blocks,
      favorite: r.favorite,
      isPublic: r.isPublic,
    });
    if (r.id) remap.rows.set(r.id, newRow.id);
    createdPages.push(newRow);
  }

  // 7) Pass 2 — write rowProps with proper remapping (now all relation row
  // ids are known).
  for (let i = 0; i < rowsWithIds.length; i++) {
    const src = rowsWithIds[i];
    const dst = createdPages[i];
    const rp = remapRowProps(src.rowProps, remap, propsByOldId);
    for (const [propId, value] of Object.entries(rp)) {
      if (value === undefined || value === null) continue;
      store.setRowValue(created.id, dst.id, propId, value);
    }
  }

  return { dbId: created.id };
}

/* ============================================================
 * AI assist — append rows to an existing database (no remap, just
 * map AI-supplied option NAMES → real option ids).
 * ============================================================ */

export interface AIRowDraft {
  title: string;
  icon?: string;
  rowProps?: Record<string, unknown>;
}

export async function applyAIRows(
  drafts: AIRowDraft[],
  db: Database,
  store: {
    addRow: (dbId: string, init?: Partial<Page>) => Promise<Page>;
    setRowValue: (dbId: string, rowPageId: string, propId: string, value: PropertyValue) => void;
  },
): Promise<{ count: number }> {
  let count = 0;
  for (const d of drafts) {
    const newRow = await store.addRow(db.id, {
      title: d.title || "",
      icon: d.icon || "📄",
    });
    for (const [propId, raw] of Object.entries(d.rowProps ?? {})) {
      const prop = db.properties.find((p) => p.id === propId || p.name === propId);
      if (!prop) continue;
      const coerced = coerceAIValue(raw, prop);
      if (coerced === undefined) continue;
      store.setRowValue(db.id, newRow.id, prop.id, coerced as PropertyValue);
    }
    count++;
  }
  return { count };
}

function coerceAIValue(raw: unknown, prop: Property): PropertyValue | undefined {
  if (raw === undefined || raw === null) return undefined;
  switch (prop.type) {
    case "checkbox": return Boolean(raw);
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case "date": {
      if (typeof raw === "string") return { date: raw };
      if (typeof raw === "object" && raw && "date" in (raw as object)) return raw as { date?: string };
      return null;
    }
    case "select":
    case "status": {
      const name = String(raw);
      const opt = prop.options?.find((o) => o.name.toLowerCase() === name.toLowerCase() || o.id === name);
      return opt?.id ?? null;
    }
    case "multi_select": {
      const arr = Array.isArray(raw) ? raw : String(raw).split(/[;,]/);
      return arr
        .map((v) => {
          const name = String(v).trim();
          return prop.options?.find((o) => o.name.toLowerCase() === name.toLowerCase() || o.id === name)?.id ?? null;
        })
        .filter((id): id is string => !!id);
    }
    case "relation":
      return Array.isArray(raw) ? raw.map(String) : [];
    case "files":
      return Array.isArray(raw) ? raw.map(String) : [];
    case "url":
    case "email":
    case "phone":
    case "text":
      return String(raw);
    case "rollup":
    case "formula":
    case "created_time":
    case "created_by":
    case "last_edited_time":
    case "last_edited_by":
    case "unique_id":
      return undefined; // computed
    default:
      return String(raw);
  }
}
