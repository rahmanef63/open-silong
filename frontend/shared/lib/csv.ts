/** Database → CSV exporter. Targets Notion's CSV import:
 *
 *  > CSV files import as a Notion database.
 *  > Rows import as pages. Columns import as properties.
 *
 *  Per Notion docs:
 *  - First row = headers (property names, NOT ids).
 *  - UTF-8 encoding (we ensure this via the BOM marker).
 *  - Dates emit MM/DD/YYYY (Notion's expected format).
 *  - Multi-select / status values flatten to comma-separated strings.
 *  - Relations / files / person omit the relation, emit display name only.
 *  - Formulas evaluate to their last-known value (we just emit empty
 *    since live eval requires a runtime — Notion would recompute anyway).
 */

import type { Database, Page, Property, PropertyValue } from "../types/domain";

const UTF8_BOM = "﻿";
const CELL_DELIM = ",";
const ROW_DELIM = "\r\n";

function escapeCell(s: string): string {
  // Per RFC 4180: quote when value contains comma, quote, or newline.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  // ISO YYYY-MM-DD → MM/DD/YYYY
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

function valueToCell(prop: Property, value: PropertyValue, allPages?: Page[]): string {
  if (value == null) return "";
  switch (prop.type) {
    case "text":
    case "url":
    case "email":
    case "phone":
      return String(value);
    case "number": {
      if (typeof value !== "number") return "";
      if (prop.numberFormat === "currency") {
        return `${prop.numberCurrencyCode ?? ""}${value}`.trim();
      }
      if (prop.numberFormat === "percent") return `${value}%`;
      return String(value);
    }
    case "checkbox":
      return value ? "Yes" : "No";
    case "select":
    case "status": {
      const opt = prop.options?.find((o) => o.id === value);
      return opt?.name ?? "";
    }
    case "multi_select": {
      if (!Array.isArray(value)) return "";
      return value
        .map((id) => prop.options?.find((o) => o.id === id)?.name ?? "")
        .filter(Boolean)
        .join(", ");
    }
    case "date": {
      const v = value as { date?: string; end?: string };
      if (!v?.date) return "";
      return v.end ? `${formatDate(v.date)} - ${formatDate(v.end)}` : formatDate(v.date);
    }
    case "person": {
      if (!Array.isArray(value)) return "";
      return value.join(", ");
    }
    case "relation": {
      // Resolve to row titles when we have the page list — Notion CSV can't
      // restore the link anyway; the human reading the CSV wants titles.
      if (!Array.isArray(value)) return "";
      if (allPages) {
        return value
          .map((id) => allPages.find((p) => p.id === id)?.title || String(id))
          .join(", ");
      }
      return value.join(", ");
    }
    case "files": {
      if (!Array.isArray(value)) return "";
      return value.map((f) => (typeof f === "string" ? f : (f as { url?: string }).url ?? "")).filter(Boolean).join(", ");
    }
    case "place":
      return typeof value === "string" ? value : "";
    case "unique_id":
      return String(value ?? "");
    case "created_time":
    case "last_edited_time":
      return typeof value === "number" ? new Date(value).toLocaleString() : "";
    case "created_by":
    case "last_edited_by":
      return String(value ?? "");
    case "formula":
    case "rollup":
    case "button":
    case "verification":
      return ""; // Computed / interactive — Notion will recompute.
    default:
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : "";
  }
}

/** Convert one row's `rowProps` into CSV cells in property order. */
function rowToCells(row: Page, properties: Property[], allPages?: Page[]): string[] {
  return properties.map((p) => {
    if (p.id === "name" || p.name.toLowerCase() === "title") {
      return escapeCell(row.title || valueToCell(p, row.rowProps?.[p.id] ?? null, allPages));
    }
    return escapeCell(valueToCell(p, row.rowProps?.[p.id] ?? null, allPages));
  });
}

/** Canonical Notion-strict CSV export. Notion's importer recognises
 *  UTF-8 (BOM tolerated) + CRLF + RFC 4180 quoting + MM/DD/YYYY dates. */
export function databaseToCsv(db: Database, rows: Page[], allPages?: Page[]): string {
  const header = ["Title", ...db.properties.map((p) => escapeCell(p.name))].join(CELL_DELIM);
  const body = rows
    .filter((r) => !r.trashed)
    .map((r) => [escapeCell(r.title || ""), ...rowToCells(r, db.properties, allPages)].join(CELL_DELIM))
    .join(ROW_DELIM);
  return UTF8_BOM + header + ROW_DELIM + body;
}

/** Trigger a browser download of CSV content. */
export function downloadCsv(filename: string, content: string): void {
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
