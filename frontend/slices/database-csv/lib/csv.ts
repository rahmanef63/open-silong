/** Slice-local CSV: import parsing + value coercion. Export side
 *  delegates to the canonical Notion-strict exporter in shared. */

import type { Page, Property, PropertyValue } from "@/shared/types/domain";
export { databaseToCsv, downloadCsv } from "@/shared/lib/csv";
import { databaseToCsv } from "@/shared/lib/csv";

/** Back-compat alias — old call sites used (db, rows, pages). */
export const exportDatabaseToCsv = databaseToCsv;

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let i = 0;
  let cell = "";
  let row: string[] = [];
  let inQuote = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuote = false; i++; continue;
      }
      cell += ch; i++; continue;
    }
    if (ch === '"') { inQuote = true; i++; continue; }
    if (ch === ",") { row.push(cell); cell = ""; i++; continue; }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = ""; rows.push(row); row = []; i++; continue;
    }
    cell += ch; i++;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  // Strip UTF-8 BOM from first header if present (Notion-emitted CSVs ship it).
  const headers = rows.shift() ?? [];
  if (headers[0]?.charCodeAt(0) === 0xfeff) headers[0] = headers[0].slice(1);
  return { headers, rows };
}

/** Property types that are computed / system-managed — never written from CSV. */
const COMPUTED_TYPES = new Set<Property["type"]>([
  "rollup", "formula", "created_time", "created_by",
  "last_edited_time", "last_edited_by", "unique_id",
]);

export function valueFromString(
  raw: string,
  prop: Property,
  ctx?: { pages?: Page[]; relationScope?: string },
): PropertyValue {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (COMPUTED_TYPES.has(prop.type)) return null;
  switch (prop.type) {
    case "checkbox":
      return /^(true|yes|1|x|✓)$/i.test(trimmed);
    case "number": {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : null;
    }
    case "date": {
      // Accept ISO YYYY-MM-DD or Notion's MM/DD/YYYY; normalize to ISO.
      const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) return { date: trimmed };
      const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (us) {
        const [, mm, dd, yyyy] = us;
        return { date: `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}` };
      }
      return { date: trimmed };
    }
    case "select":
    case "status": {
      const opt = prop.options?.find((o) => o.name.toLowerCase() === trimmed.toLowerCase());
      return opt?.id ?? null;
    }
    case "multi_select": {
      const parts = trimmed.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
      return parts
        .map((name) => prop.options?.find((o) => o.name.toLowerCase() === name.toLowerCase())?.id ?? null)
        .filter((id): id is string => !!id);
    }
    case "relation": {
      const all = (ctx?.pages ?? []).filter((p) => !p.trashed);
      const scopeId = prop.relationDatabaseId ?? ctx?.relationScope ?? null;
      const candidates = scopeId
        ? all.filter((p) => p.rowOfDatabaseId === scopeId)
        : all;
      const parts = trimmed.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
      return parts
        .map((needle) => {
          const lc = needle.toLowerCase();
          const hit = candidates.find((p) => p.title.toLowerCase() === lc)
                   ?? candidates.find((p) => p.id === needle);
          return hit?.id ?? null;
        })
        .filter((id): id is string => !!id);
    }
    case "person":
    case "files":
      return null;
    case "url":
    case "email":
    case "phone":
    case "text":
      return trimmed;
    default:
      return trimmed;
  }
}
