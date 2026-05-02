import type { Database, Page, Property, PropertyValue } from "@/shared/types/domain";

const CSV_DELIM = ",";
const CSV_NL = "\n";

function escapeCell(s: string): string {
  if (s == null) return "";
  const needsQuote = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function valueToString(value: PropertyValue | undefined, prop: Property, allPages: Page[]): string {
  if (value === undefined || value === null) return "";
  if (prop.type === "checkbox") return value === true ? "true" : "false";
  if (prop.type === "date" && typeof value === "object" && "date" in value) return value.date ?? "";
  if (prop.type === "select" || prop.type === "status") {
    return prop.options?.find((o) => o.id === value)?.name ?? String(value);
  }
  if (prop.type === "multi_select") {
    const ids = Array.isArray(value) ? value : [];
    return ids.map((id) => prop.options?.find((o) => o.id === id)?.name ?? id).join("; ");
  }
  if (prop.type === "relation") {
    const ids = Array.isArray(value) ? value : [];
    return ids.map((id) => allPages.find((p) => p.id === id)?.title ?? id).join("; ");
  }
  if (Array.isArray(value)) return value.join("; ");
  return String(value);
}

export function exportDatabaseToCsv(db: Database, rows: Page[], allPages: Page[]): string {
  const headers = ["Title", ...db.properties.map((p) => p.name)];
  const lines: string[] = [headers.map(escapeCell).join(CSV_DELIM)];
  for (const row of rows) {
    const cells = [
      escapeCell(row.title || ""),
      ...db.properties.map((p) =>
        escapeCell(valueToString(row.rowProps?.[p.id], p, allPages)),
      ),
    ];
    lines.push(cells.join(CSV_DELIM));
  }
  return lines.join(CSV_NL);
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
  const headers = rows.shift() ?? [];
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
    case "date":
      return { date: trimmed };
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
      // Raw CSV strings aren't real person ids / file refs; skip rather than
      // write garbage that the UI can't render.
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
