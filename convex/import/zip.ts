"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import JSZip from "jszip";
import { gunzipSync } from "zlib";
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
  diagnostics?: {
    blobBytes: number;
    firstBytesHex: string;
    wasGzipWrapped: boolean;
    entryCount: number;
  };
}

const HEX = (n: number) => n.toString(16).padStart(2, "0");
const headHex = (u8: Uint8Array, n = 8) =>
  Array.from(u8.slice(0, n), HEX).join(" ");

/**
 * Import a Notion-export-style ZIP. Accepts md / csv / html / pdf entries.
 * - Markdown / HTML  → page with parsed blocks
 * - CSV              → database + host page containing a `database` block,
 *                      so it shows up in the sidebar tree
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

    let u8 = new Uint8Array(await blob.arrayBuffer());
    const blobBytes = u8.byteLength;
    const firstBytesHex = headHex(u8);

    // Self-hosted Convex behind Traefik: response can be served with
    // Content-Encoding: gzip. The SDK *usually* decompresses, but in some
    // proxy configurations the bytes arrive still gzipped. Auto-unwrap so
    // the user doesn't have to debug the proxy chain.
    let wasGzipWrapped = false;
    if (u8.length >= 2 && u8[0] === 0x1f && u8[1] === 0x8b) {
      try {
        const inflated = gunzipSync(u8);
        u8 = new Uint8Array(inflated.buffer, inflated.byteOffset, inflated.byteLength);
        wasGzipWrapped = true;
      } catch (e) {
        throw new Error(`Gagal gunzip wrapper: ${(e as Error).message.slice(0, 120)}`);
      }
    }

    // ZIP central-directory magic = `PK\x03\x04` (local file header) or
    // `PK\x05\x06` (empty zip). Reject early so the user doesn't get a
    // cryptic JSZip stack trace deep in entry parsing.
    const isZipMagic =
      u8.length >= 4 && u8[0] === 0x50 && u8[1] === 0x4b &&
      ((u8[2] === 0x03 && u8[3] === 0x04) ||
        (u8[2] === 0x05 && u8[3] === 0x06));
    if (!isZipMagic) {
      throw new Error(
        `File bukan ZIP. ${blobBytes} bytes, head=${firstBytesHex}` +
          (wasGzipWrapped ? " (sudah di-gunzip)" : ""),
      );
    }

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(u8);
    } catch (e) {
      throw new Error(`JSZip load gagal: ${(e as Error).message.slice(0, 200)}`);
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
            flat.push({
              name: `${f.name.replace(/\.zip$/i, "")}/${innerFile.name}`,
              entry: innerFile,
            });
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

    console.log(
      `[importZip] storage=${storageId} bytes=${blobBytes} head=${firstBytesHex}` +
        ` gunzipped=${wasGzipWrapped} entries=${flat.length}`,
    );

    const summary: ImportSummary = {
      pages: 0,
      databases: 0,
      files: 0,
      skipped: 0,
      errors: [],
      diagnostics: {
        blobBytes,
        firstBytesHex,
        wasGzipWrapped,
        entryCount: flat.length,
      },
    };

    const fileBlocks: Array<{
      id: string; type: "image" | "paragraph"; text: string;
      url?: string; caption?: string;
    }> = [];

    flat.sort((a, b) => a.name.localeCompare(b.name));

    for (const item of flat) {
      const path = item.name;
      const entry = item.entry;
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
          const dbName = titleFromName || "Imported database";
          // Wrap db in a host page so it appears in the sidebar tree and
          // is navigable. Without the wrapper page the database is orphan
          // and only reachable by direct URL.
          await ctx.runMutation(
            internal.import.internal.createDatabaseFromCsvWithHost,
            { userId, parentId, name: dbName, headers, rows: body },
          );
          summary.databases++;
          summary.pages++;
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
        console.error(`[importZip] entry=${path} failed:`, e);
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

    console.log(`[importZip] done`, summary);
    return summary;
  },
});

async function readText(
  entry: JSZip.JSZipObject,
  summary: ImportSummary,
  path: string,
): Promise<string | null> {
  const u8 = await entry.async("uint8array");
  if (u8.length > MAX_TEXT_BYTES) {
    summary.errors.push({ path, reason: `text > ${MAX_TEXT_BYTES} bytes` });
    return null;
  }
  if (looksBinary(u8)) {
    summary.errors.push({
      path,
      reason: `tampak binary (${u8.length}b, head=${headHex(u8)})`,
    });
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
  const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
  return await ctx.storage.store(new Blob([ab]));
}

/** Heuristic: text files have < 1% NUL bytes, < 5% C0 control chars, and
 *  decode without producing a flood of replacement characters. Sample 4 KB
 *  to keep cost cheap. Catches both raw deflate streams (lots of control
 *  chars) and stored binary that happens to be mostly high-bit (lots of
 *  decode failures). */
function looksBinary(u8: Uint8Array): boolean {
  const n = Math.min(u8.length, 4096);
  if (n === 0) return false;
  let nul = 0;
  let ctrl = 0;
  for (let i = 0; i < n; i++) {
    const c = u8[i];
    if (c === 0) nul++;
    else if (c < 0x09 || (c > 0x0d && c < 0x20)) ctrl++;
  }
  if (nul / n > 0.01) return true;
  if (ctrl / n > 0.05) return true;

  // Last-ditch: decode the head in strict mode. If it throws, the bytes
  // aren't valid UTF-8 — treat as binary.
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(u8.subarray(0, n));
  } catch {
    return true;
  }
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
