/** Pure dispatch layer over buildSelectionExport — picks the right
 *  serializer (JSON Nosion-native vs ZIP Notion-compatible) and
 *  triggers the browser download. Component just wires inputs. */

import { downloadFile } from "@/shared/lib/markdown";
import type { Page } from "@/shared/types/domain";
import { buildSelectionExport, type BuildExportInput } from "./buildExport";

export type ExportFormat = "json" | "zip";

export interface RunExportOptions extends BuildExportInput {
  format: ExportFormat;
  /** Date-stamp prefix for the downloaded file (YYYY-MM-DD). */
  stamp?: string;
}

export interface RunExportResult {
  counts: { pages: number; databases: number };
}

export async function runExport(opts: RunExportOptions): Promise<RunExportResult> {
  const { format, stamp = new Date().toISOString().slice(0, 10), ...buildInput } = opts;
  const r = buildSelectionExport(buildInput);
  const name = `silong-export-${stamp}`;

  if (format === "json") {
    downloadFile(`${name}.json`, r.json, "application/json");
  } else {
    const dbRows = new Map<string, Page[]>();
    for (const p of r.pages) {
      if (!p.rowOfDatabaseId) continue;
      const arr = dbRows.get(p.rowOfDatabaseId) ?? [];
      arr.push(p);
      dbRows.set(p.rowOfDatabaseId, arr);
    }
    // Lazy-load JSZip (~90KB) only on ZIP export so it stays out of the
    // eager dashboard-shell chunk that mounts WorkspaceIODialog.
    const { downloadWorkspaceZip } = await import("@/shared/lib/zipExport");
    await downloadWorkspaceZip(
      { pages: r.pages, databases: r.databases, databaseRows: dbRows },
      `${name}.zip`,
    );
  }

  return { counts: { pages: r.counts.pages, databases: r.counts.databases } };
}
