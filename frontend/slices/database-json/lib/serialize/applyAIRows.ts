import type { Database, Page, Property, PropertyValue } from "@/shared/types/domain";
import type { AIRowDraft } from "./types";

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
