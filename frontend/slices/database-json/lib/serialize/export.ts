import type { Database, Page } from "@/shared/types/domain";
import type { DatabaseExportV1 } from "./types";

function stripUndefined<T extends object>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

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
