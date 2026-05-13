import type { Database, Page, Property, PropertyValue } from "@/shared/types/domain";
import { uid, type DatabaseExportV1, type RowExport } from "./types";
import { buildPropAndOptionRemap, remapPropertyRefs, remapRowProps, remapViews } from "./remap";

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
  const { remap, properties: remappedProps } = buildPropAndOptionRemap(json.database.properties);
  const propsByOldId = new Map<string, Property>();
  for (const p of json.database.properties) propsByOldId.set(p.id, p);

  const propsWithRefs = remapPropertyRefs(remappedProps, remap);

  const remappedViews = remapViews(json.database.views, remap);
  const newActiveView = json.database.activeViewId
    ? (remap.views.get(json.database.activeViewId) ?? remappedViews[0]?.id ?? "")
    : remappedViews[0]?.id ?? "";

  const remappedTemplates = (json.database.templates ?? []).map((t) => {
    const newTplId = uid();
    remap.templates.set(t.id, newTplId);
    return {
      ...t,
      id: newTplId,
      rowProps: remapRowProps(t.rowProps, remap, propsByOldId),
    };
  });

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
