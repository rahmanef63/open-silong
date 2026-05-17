/** Render a Database (schema + rows) as an inline table for MD/HTML
 *  exports. Used by blockToMarkdown/blockToHtml when a `database`
 *  block fires, so embedded databases come through as real data
 *  (not a dead `[Database: name]` link). */

import type { Database, Page } from "../types/domain";
import { valueToCell } from "./csv";

function escMdCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/** GFM table — Notion's MD importer turns this into a simple table
 *  block (not a database; for that, the ZIP exporter still ships a
 *  sibling `databases/<name>.csv`). */
export function databaseToMarkdownTable(
  db: Database,
  rows: Page[],
  allPages?: Page[],
): string {
  const live = rows.filter((r) => !r.trashed);
  const headers = ["Title", ...db.properties.map((p) => p.name)];
  const sep = headers.map(() => "---");
  const lines = [
    `| ${headers.map(escMdCell).join(" | ")} |`,
    `| ${sep.join(" | ")} |`,
  ];
  for (const row of live) {
    const cells = [
      escMdCell(row.title || ""),
      ...db.properties.map((p) =>
        escMdCell(valueToCell(p, row.rowProps?.[p.id] ?? null, allPages)),
      ),
    ];
    lines.push(`| ${cells.join(" | ")} |`);
  }
  return lines.join("\n");
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function databaseToHtmlTable(db: Database, rows: Page[], allPages?: Page[]): string {
  const live = rows.filter((r) => !r.trashed);
  const headers = ["Title", ...db.properties.map((p) => p.name)]
    .map((h) => `<th>${escHtml(h)}</th>`).join("");
  const body = live.map((row) => {
    const cells = [row.title || "", ...db.properties.map((p) => valueToCell(p, row.rowProps?.[p.id] ?? null, allPages))]
      .map((c) => `<td>${escHtml(c)}</td>`).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  return `<table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
}
