import { Block, Page } from "../types";
import { uid } from "./uid";
import { lookupDb, type ExportContext } from "./exportContext";
import { databaseToMarkdownTable } from "./databaseTable";

export function blockToMarkdown(b: Block, depth = 0, ctx?: ExportContext): string {
  const indent = "  ".repeat(depth);
  switch (b.type) {
    case "h1": return `${indent}# ${b.text}`;
    case "h2": return `${indent}## ${b.text}`;
    case "h3": return `${indent}### ${b.text}`;
    case "h4": return `${indent}#### ${b.text}`;
    case "todo": return `${indent}- [${b.checked ? "x" : " "}] ${b.text}`;
    case "bullet": return `${indent}- ${b.text}`;
    case "numbered": return `${indent}1. ${b.text}`;
    case "quote": return `${indent}> ${b.text}`;
    case "callout": return `${indent}> 💡 ${b.text}`;
    case "code": return "```" + (b.lang ?? "") + "\n" + b.text + "\n```";
    case "divider": return "---";
    case "image": return b.url ? `![${b.caption ?? ""}](${b.url})` : "";
    case "audio": return b.url ? `[🔊 ${b.caption ?? "Audio"}](${b.url})` : "";
    case "video": return b.url ? `[🎬 ${b.caption ?? "Video"}](${b.url})` : "";
    case "embed": return b.url ? `[${b.url}](${b.url})` : "";
    case "button": {
      const url = (b as { url?: string }).url ?? "#";
      return `[**${b.text || "Button"}**](${url})`;
    }
    case "equation": return `$$\n${b.text ?? ""}\n$$`;
    case "table": {
      const rows = (b.text ?? "").split("\n").filter(Boolean);
      if (rows.length === 0) return "";
      const cells = rows.map((r) => r.split("|").map((c) => c.trim()));
      const cols = Math.max(...cells.map((r) => r.length));
      const pad = (r: string[]) => r.concat(Array(Math.max(0, cols - r.length)).fill(""));
      const sep = Array(cols).fill("---");
      return [
        `| ${pad(cells[0]).join(" | ")} |`,
        `| ${sep.join(" | ")} |`,
        ...cells.slice(1).map((r) => `| ${pad(r).join(" | ")} |`),
      ].join("\n");
    }
    case "toggle": {
      const head = `${indent}<details><summary>${b.text}</summary>`;
      const body = (b.children ?? []).map(c => blockToMarkdown(c, depth + 1, ctx)).join("\n");
      return `${head}\n\n${body}\n\n${indent}</details>`;
    }
    case "columns2":
    case "columns3":
    case "columns4":
    case "columns5":
      return (b.columns ?? []).flatMap(col => col.map(c => blockToMarkdown(c, depth, ctx))).join("\n\n");
    case "page":
      return `${indent}[📄 ${b.text || "Subpage"}](#page-${b.pageId ?? ""})`;
    case "database": {
      const hit = lookupDb(ctx, b.databaseId);
      if (!hit) return `${indent}[🗂️ ${b.text || "Database"}](#db-${b.databaseId ?? ""})`;
      const heading = `${indent}### 🗂️ ${b.text || hit.db.name || "Database"}`;
      const table = databaseToMarkdownTable(hit.db, hit.rows, ctx?.allPages);
      return `${heading}\n\n${table}`;
    }
    case "synced":
      return `${indent}${b.text ?? ""}`;
    case "toc":
      return ""; // Notion re-derives at import time.
    default:
      return `${indent}${b.text ?? ""}`;
  }
}

export function pageToMarkdown(page: Page, ctx?: ExportContext): string {
  const head = `# ${page.title || "Untitled"}\n\n`;
  return head + page.blocks.map(b => blockToMarkdown(b, 0, ctx)).filter(Boolean).join("\n\n");
}

export function pageToPlainText(page: Page): string {
  const lines: string[] = [];
  if (page.title) lines.push(page.title);
  const walk = (blocks: Block[]) => {
    for (const b of blocks) {
      if (b.text) lines.push(b.text);
      if (b.children) walk(b.children);
      if (b.columns) b.columns.forEach(walk);
    }
  };
  walk(page.blocks);
  return lines.join("\n");
}

/** Markdown → blocks parser. Two-phase:
 *   1. Line scan with code-fence + table lookahead.
 *   2. Inline marks (`**bold**`, `_italic_`, `~~strike~~`, `` `code` ``,
 *      `[text](url)`) are LEFT IN PLACE — the editor stores its rich
 *      inline as markdown source (see CLAUDE.md "Slack model" note) and
 *      decorates in place at render time, so a paragraph with mixed
 *      formatting needs no further transformation.
 */
export function markdownToBlocks(md: string): Block[] {
  const rawLines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let inFence = false;
  let fenceLang = "";
  let fenceBuf: string[] = [];

  const push = (b: Partial<Block> & { type: Block["type"]; text: string }) =>
    blocks.push({ id: uid(), ...b });

  // Two-pass index walker so the table branch can consume the
  // separator + data rows in a single shot via lookahead.
  let i = 0;
  while (i < rawLines.length) {
    const raw = rawLines[i];

    if (inFence) {
      if (raw.trim().startsWith("```")) {
        push({ type: "code", text: fenceBuf.join("\n"), lang: fenceLang });
        inFence = false; fenceLang = ""; fenceBuf = [];
      } else {
        fenceBuf.push(raw);
      }
      i++; continue;
    }

    const trimmed = raw.trim();

    if (trimmed.startsWith("```")) {
      inFence = true;
      fenceLang = trimmed.slice(3).trim();
      i++; continue;
    }
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      push({ type: "divider", text: "" });
      i++; continue;
    }

    // ATX headings 1..6.
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const type = level === 1 ? "h1" : level === 2 ? "h2" : level === 3 ? "h3" : "h4";
      push({ type, text });
      i++; continue;
    }

    // Task list: -, *, + + space + [ ]/[x] + space.
    const task = /^[-*+]\s+\[( |x|X)\]\s+(.*)$/.exec(trimmed);
    if (task) {
      const checked = task[1].toLowerCase() === "x";
      push({ type: "todo", text: task[2], checked });
      i++; continue;
    }

    // Unordered list: -, *, + + space.
    if (/^[-*+]\s+/.test(trimmed)) {
      push({ type: "bullet", text: trimmed.replace(/^[-*+]\s+/, "") });
      i++; continue;
    }

    // Ordered list: digits + . + space.
    if (/^\d+\.\s+/.test(trimmed)) {
      push({ type: "numbered", text: trimmed.replace(/^\d+\.\s+/, "") });
      i++; continue;
    }

    if (trimmed.startsWith("> ")) {
      push({ type: "quote", text: trimmed.slice(2) });
      i++; continue;
    }
    if (trimmed === ">") {
      push({ type: "quote", text: "" });
      i++; continue;
    }

    // Table: header row + separator row + N data rows.
    // Header is any line shaped `| ... |` (or just `cell | cell`) AND
    // the NEXT line is `| ---|...:---: |` (separator with dashes +
    // optional alignment colons). Falls through to paragraph if the
    // separator doesn't validate.
    if (looksLikeTableRow(trimmed) && i + 1 < rawLines.length
        && isTableSeparator(rawLines[i + 1].trim())) {
      const headerCells = splitTableCells(trimmed);
      const tableRows: string[][] = [headerCells];
      let j = i + 2;
      while (j < rawLines.length && looksLikeTableRow(rawLines[j].trim())) {
        tableRows.push(splitTableCells(rawLines[j].trim()));
        j++;
      }
      // Pad rows to header width — markdown tables tolerate ragged
      // bodies but our table block stores a clean grid.
      const cols = headerCells.length;
      const padded = tableRows.map((r) =>
        r.length === cols ? r : r.concat(Array(Math.max(0, cols - r.length)).fill("")).slice(0, cols),
      );
      push({ type: "table", text: "", tableRows: padded, tableHeader: true });
      i = j; continue;
    }

    if (trimmed === "") { i++; continue; }

    push({ type: "paragraph", text: trimmed });
    i++;
  }

  if (inFence && fenceBuf.length) {
    push({ type: "code", text: fenceBuf.join("\n"), lang: fenceLang });
  }

  return blocks.length ? blocks : [{ id: uid(), type: "paragraph", text: "" }];
}

function looksLikeTableRow(line: string): boolean {
  // Must contain at least one pipe + non-pipe content. Reject lines
  // that are JUST pipes/spaces (those are not tables).
  if (!line.includes("|")) return false;
  const stripped = line.replace(/\\\|/g, "");
  return /\|/.test(stripped) && /[^|\s]/.test(stripped);
}

function isTableSeparator(line: string): boolean {
  // `| --- | :---: | ---: |` — each cell is dashes with optional
  // leading/trailing colons for alignment.
  if (!line.includes("|")) return false;
  const cells = splitTableCells(line);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{3,}:?$/.test(c.trim()));
}

function splitTableCells(line: string): string[] {
  // Drop leading/trailing pipes if present (`| a | b |` → `a | b`).
  const inner = line.replace(/^\s*\|/, "").replace(/\|\s*$/, "");
  return inner.split("|").map((c) => c.trim());
}

export function downloadFile(filename: string, content: string, mime = "text/markdown") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}
