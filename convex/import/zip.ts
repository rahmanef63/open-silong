"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import JSZip from "jszip";
import { markdownToBlocks, htmlToBlocks, parseCsv } from "./markdown";

const MAX_ZIP_BYTES = 50 * 1024 * 1024;
const MAX_ENTRIES = 5_000;
const MAX_TEXT_BYTES = 1 * 1024 * 1024;
const MAX_BINARY_BYTES = 25 * 1024 * 1024;

const uid = () => Math.random().toString(36).slice(2, 10);

interface ImportSummary {
  pages: number;
  databases: number;
  files: number;
  skipped: number;
  errors: { path: string; reason: string }[];
}

/**
 * Import a Notion-export-style ZIP. Accepts md / csv / html / pdf entries.
 * - Markdown / HTML  → page with parsed blocks
 * - CSV              → database (header row → text props, body rows → rows)
 * - PDF / images     → uploaded to Convex storage; appended as blocks under
 *                      a single "Imported files" page
 *
 * Caller uploads the ZIP via generateUploadUrl + POST first, then passes
 * the resulting storageId here.
 */
export const importZip = action({
  args: {
    storageId: v.string(),
    parentId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { storageId, parentId }): Promise<ImportSummary> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Belum login");

    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("File ZIP tidak ditemukan di storage");
    if (blob.size > MAX_ZIP_BYTES) {
      throw new Error(`ZIP terlalu besar (${blob.size} > ${MAX_ZIP_BYTES} bytes)`);
    }

    const ab = await blob.arrayBuffer();
    const u8 = new Uint8Array(ab);
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(u8);
    } catch (e) {
      throw new Error(`Bukan ZIP yang valid: ${(e as Error).message.slice(0, 120)}`);
    }

    // Notion's "Export workspace" sometimes ships an outer zip that contains
    // per-page sub-zips. Recurse one level so the user doesn't have to unzip
    // manually before importing.
    const flat: { name: string; entry: JSZip.JSZipObject }[] = [];
    for (const f of Object.values(zip.files)) {
      if (f.dir) continue;
      if (f.name.toLowerCase().endsWith(".zip")) {
        try {
          const inner = await JSZip.loadAsync(await f.async("uint8array"));
          for (const innerFile of Object.values(inner.files)) {
            if (innerFile.dir) continue;
            flat.push({ name: `${f.name.replace(/\.zip$/i, "")}/${innerFile.name}`, entry: innerFile });
          }
        } catch {
          flat.push({ name: f.name, entry: f });
        }
      } else {
        flat.push({ name: f.name, entry: f });
      }
    }
    if (flat.length > MAX_ENTRIES) {
      throw new Error(`Terlalu banyak entry (${flat.length} > ${MAX_ENTRIES})`);
    }

    const summary: ImportSummary = {
      pages: 0,
      databases: 0,
      files: 0,
      skipped: 0,
      errors: [],
    };

    const fileBlocks: Array<{ id: string; type: "image" | "paragraph"; text: string; url?: string; caption?: string }> = [];

    // Sort entries so root files import first; nested files later. Stable.
    flat.sort((a, b) => a.name.localeCompare(b.name));

    for (const item of flat) {
      const path = item.name;
      const entry = item.entry;
      // Skip macOS metadata + hidden + obvious junk.
      if (
        path.includes("__MACOSX/") ||
        path.split("/").some((s) => s.startsWith("._") || s === ".DS_Store")
      ) { summary.skipped++; continue; }

      const lower = path.toLowerCase();
      const base = path.split("/").pop() ?? path;
      const titleFromName = stripNotionId(base.replace(/\.[^.]+$/, ""));

      try {
        if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
          const text = await readText(entry, summary, path);
          if (text === null) continue;
          const { title, body } = splitMarkdownTitle(text, titleFromName);
          const blocks = markdownToBlocks(body);
          await ctx.runMutation(internal.import.internal.createPage, {
            userId,
            parentId,
            title,
            icon: "📄",
            blocks,
          });
          summary.pages++;
        } else if (lower.endsWith(".html") || lower.endsWith(".htm")) {
          const text = await readText(entry, summary, path);
          if (text === null) continue;
          const blocks = htmlToBlocks(text);
          await ctx.runMutation(internal.import.internal.createPage, {
            userId,
            parentId,
            title: titleFromName,
            icon: "🌐",
            blocks,
          });
          summary.pages++;
        } else if (lower.endsWith(".csv")) {
          const text = await readText(entry, summary, path);
          if (text === null) continue;
          const rows = parseCsv(text);
          if (rows.length === 0) {
            summary.errors.push({ path, reason: "CSV kosong" });
            continue;
          }
          const headers = rows[0];
          const body = rows.slice(1);
          await ctx.runMutation(internal.import.internal.createDatabaseFromCsv, {
            userId,
            name: titleFromName || "Imported database",
            headers,
            rows: body,
          });
          summary.databases++;
        } else if (lower.endsWith(".pdf")) {
          const stored = await storeBinary(ctx, entry, summary, path);
          if (!stored) continue;
          await ctx.runMutation(internal.import.internal.recordFileOwnership, {
            userId, storageId: stored,
          });
          fileBlocks.push({
            id: uid(),
            type: "paragraph",
            text: `📎 ${base} — convex://${stored}`,
          });
          summary.files++;
        } else if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(lower)) {
          const stored = await storeBinary(ctx, entry, summary, path);
          if (!stored) continue;
          await ctx.runMutation(internal.import.internal.recordFileOwnership, {
            userId, storageId: stored,
          });
          fileBlocks.push({
            id: uid(),
            type: "image",
            text: "",
            url: `convex://${stored}`,
            caption: base,
          });
          summary.files++;
        } else {
          summary.skipped++;
        }
      } catch (e) {
        summary.errors.push({ path, reason: (e as Error).message.slice(0, 200) });
      }
    }

    if (fileBlocks.length > 0) {
      const indexBlocks: typeof fileBlocks = [
        { id: uid(), type: "paragraph", text: `Imported ${fileBlocks.length} file(s) from ZIP.` },
        ...fileBlocks,
      ];
      await ctx.runMutation(internal.import.internal.createPage, {
        userId,
        parentId,
        title: "Imported files",
        icon: "📦",
        blocks: indexBlocks,
      });
      summary.pages++;
    }

    return summary;
  },
});

async function readText(
  entry: JSZip.JSZipObject,
  summary: ImportSummary,
  path: string,
): Promise<string | null> {
  // Pull as Uint8Array first so we can sniff binary masquerading as text and
  // strip the UTF-8 BOM. Letting JSZip decompress as "string" sometimes hands
  // back the raw deflated bytes if the entry's compression flag is unusual.
  const u8 = await entry.async("uint8array");
  if (u8.length > MAX_TEXT_BYTES) {
    summary.errors.push({ path, reason: `text > ${MAX_TEXT_BYTES} bytes` });
    return null;
  }
  if (looksBinary(u8)) {
    summary.errors.push({ path, reason: "isi tampak binary, bukan teks" });
    return null;
  }
  // Strip UTF-8 BOM if present.
  const start = u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf ? 3 : 0;
  return new TextDecoder("utf-8", { fatal: false }).decode(u8.subarray(start));
}

async function storeBinary(
  ctx: { storage: { store(blob: Blob): Promise<string> } },
  entry: JSZip.JSZipObject,
  summary: ImportSummary,
  path: string,
): Promise<string | null> {
  const u8 = await entry.async("uint8array");
  if (u8.length > MAX_BINARY_BYTES) {
    summary.errors.push({ path, reason: `binary > ${MAX_BINARY_BYTES} bytes` });
    return null;
  }
  return await ctx.storage.store(new Blob([u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer]));
}

/** Heuristic: a text file in practice has < 1% NUL bytes and decodes cleanly.
 *  We scan a 4 KB head sample; cheap and good enough to reject zip-of-zip
 *  artifacts (raw deflate streams) accidentally given a `.md` extension. */
function looksBinary(u8: Uint8Array): boolean {
  const n = Math.min(u8.length, 4096);
  if (n === 0) return false;
  let nul = 0;
  let nonPrint = 0;
  for (let i = 0; i < n; i++) {
    const c = u8[i];
    if (c === 0) nul++;
    else if (c < 0x09 || (c > 0x0d && c < 0x20)) nonPrint++;
  }
  if (nul / n > 0.01) return true;
  if (nonPrint / n > 0.05) return true;
  return false;
}

/** Notion exports page filenames as `My page abc123def456.md` — strip the
 *  trailing 32-hex id for a clean title. */
function stripNotionId(name: string): string {
  return name.replace(/\s+[0-9a-f]{20,}$/i, "").trim() || name;
}

/** Notion markdown files start with `# Title` — promote that to page title
 *  and drop it from the body to avoid duplicate H1. */
function splitMarkdownTitle(md: string, fallback: string): { title: string; body: string } {
  const m = md.match(/^\s*#\s+(.+)\s*\n+/);
  if (m) return { title: m[1].trim(), body: md.slice(m[0].length) };
  return { title: fallback, body: md };
}
