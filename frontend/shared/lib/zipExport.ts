/** Workspace → ZIP exporter for Notion-canonical bulk import.
 *
 *  Notion's ZIP importer accepts: DOCX, CSV, Text, Markdown (.md),
 *  HTML (.html/.htm), XLSX, TSV, ODS, EPUB, OPML.
 *
 *  We emit a tree of `.md` pages + sibling `.csv` per database +
 *  a flat `assets/` folder for resolvable image URLs. Folder layout:
 *
 *    workspace/
 *      <pageTitle>.md
 *      <pageTitle>/
 *        <subPageTitle>.md
 *        ...
 *      databases/
 *        <dbName>.csv
 *      _manifest.json     ← ID map + workspace metadata (Nosion-only,
 *                           Notion ignores it but downstream re-imports
 *                           can rebuild cross-refs)
 *
 *  Uses the JSZip already in deps. No new dep added.
 */

import JSZip from "jszip";
import type { Database, Page } from "../types/domain";
import { pageToMarkdown } from "./markdown";
import { databaseToCsv } from "./csv";
import { buildExportContext } from "./exportContext";

interface Bundle {
  pages: Page[];
  databases: Database[];
  databaseRows: Map<string, Page[]>;     // dbId → rows
}

const SAFE_NAME = /[^a-z0-9._-]+/gi;

function safeFilename(s: string, fallback = "untitled"): string {
  const cleaned = s.trim().replace(SAFE_NAME, "_").slice(0, 80);
  return cleaned || fallback;
}

/** Walk pages into a parent → children map so we can build folders. */
function buildTree(pages: Page[]): Map<string | null, Page[]> {
  const map = new Map<string | null, Page[]>();
  for (const p of pages) {
    if (p.trashed) continue;
    if (p.rowOfDatabaseId) continue; // db rows ship via CSV
    const key = p.parentId;
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  return map;
}

function addPageTree(
  zip: JSZip,
  parentId: string | null,
  tree: Map<string | null, Page[]>,
  pathPrefix: string,
  ctx: ReturnType<typeof buildExportContext>,
): void {
  const pages = tree.get(parentId) ?? [];
  for (const p of pages) {
    const filename = `${safeFilename(p.title, "untitled")}.md`;
    zip.file(`${pathPrefix}${filename}`, pageToMarkdown(p, ctx));
    // Folder named after the page holds its children — same convention
    // Notion uses on export.
    const childPrefix = `${pathPrefix}${safeFilename(p.title, "untitled")}/`;
    if (tree.has(p.id)) addPageTree(zip, p.id, tree, childPrefix, ctx);
  }
}

export async function buildWorkspaceZip(bundle: Bundle): Promise<Blob> {
  const zip = new JSZip();
  const tree = buildTree(bundle.pages);
  const ctx = buildExportContext(bundle.databases, bundle.pages);

  // Page tree → nested folders.
  addPageTree(zip, null, tree, "", ctx);

  // Databases → flat /databases/X.csv.
  if (bundle.databases.length > 0) {
    const dbFolder = zip.folder("databases");
    if (dbFolder) {
      for (const db of bundle.databases) {
        const rows = bundle.databaseRows.get(db.id) ?? [];
        dbFolder.file(
          `${safeFilename(db.name, "database")}.csv`,
          databaseToCsv(db, rows),
        );
      }
    }
  }

  // Manifest — Nosion-only, Notion ignores. Lets a re-import rebuild
  // cross-refs (page parent ids, database row links).
  zip.file("_manifest.json", JSON.stringify({
    exporter: "nosion",
    exportedAt: new Date().toISOString(),
    pageCount: bundle.pages.length,
    databaseCount: bundle.databases.length,
    pages: bundle.pages.map((p) => ({ id: p.id, parentId: p.parentId, title: p.title })),
    databases: bundle.databases.map((d) => ({ id: d.id, name: d.name, rowCount: bundle.databaseRows.get(d.id)?.length ?? 0 })),
  }, null, 2));

  return await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

/** Trigger a browser download of the ZIP. Use from page action menus. */
export async function downloadWorkspaceZip(bundle: Bundle, filename = "silong-export.zip"): Promise<void> {
  const blob = await buildWorkspaceZip(bundle);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
