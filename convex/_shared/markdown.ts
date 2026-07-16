/** Server-side markdown → blocks parser. Mirror of the frontend
 *  parser in frontend/shared/lib/markdown.ts. Kept duplicated rather
 *  than cross-importing so convex stays self-contained (no DOM /
 *  React paths leak in).
 *
 *  Used by `pages.appendMarkdown` to let the AI agent stream content
 *  through a single mutation instead of N round-trips. */

import { uid } from "./uid";

export interface ParsedBlock {
  id: string;
  type: string;
  text: string;
  [key: string]: unknown;
}

export function markdownToBlocks(md: string): ParsedBlock[] {
  const rawLines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: ParsedBlock[] = [];
  let inFence = false;
  let fenceLang = "";
  let fenceBuf: string[] = [];

  const push = (b: Partial<ParsedBlock> & { type: string; text: string }) =>
    blocks.push({ id: uid(), ...b });

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
    const indent = Math.min(3, indentLevel(raw));

    if (trimmed.startsWith("```")) {
      inFence = true;
      fenceLang = trimmed.slice(3).trim();
      i++; continue;
    }
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      push({ type: "divider", text: "" });
      i++; continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      push({ type: `h${level}`, text: heading[2] });
      i++; continue;
    }

    const task = /^[-*+]\s+\[( |x|X)\]\s+(.*)$/.exec(trimmed);
    if (task) {
      const checked = task[1].toLowerCase() === "x";
      push({ type: "todo", text: task[2], checked, ...(indent ? { indent } : {}) });
      i++; continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      push({ type: "bullet", text: trimmed.replace(/^[-*+]\s+/, ""), ...(indent ? { indent } : {}) });
      i++; continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      push({ type: "numbered", text: trimmed.replace(/^\d+\.\s+/, ""), ...(indent ? { indent } : {}) });
      i++; continue;
    }

    // GFM admonition: > [!NOTE]
    const adm = /^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*$/i.exec(trimmed);
    if (adm) {
      const kind = adm[1].toLowerCase();
      const body: string[] = [];
      let j = i + 1;
      while (j < rawLines.length && /^>\s?/.test(rawLines[j].trim())) {
        body.push(rawLines[j].trim().replace(/^>\s?/, ""));
        j++;
      }
      push({ type: "callout", text: body.join("\n"), calloutKind: kind });
      i = j; continue;
    }

    if (trimmed.startsWith("> ")) {
      push({ type: "quote", text: trimmed.slice(2) });
      i++; continue;
    }
    if (trimmed === ">") {
      push({ type: "quote", text: "" });
      i++; continue;
    }

    // Table with separator lookahead.
    if (looksLikeTableRow(trimmed) && i + 1 < rawLines.length
        && isTableSeparator(rawLines[i + 1].trim())) {
      const headerCells = splitTableCells(trimmed);
      const tableAlign = parseTableAlignment(rawLines[i + 1].trim());
      const tableRows: string[][] = [headerCells];
      let j = i + 2;
      while (j < rawLines.length && looksLikeTableRow(rawLines[j].trim())) {
        tableRows.push(splitTableCells(rawLines[j].trim()));
        j++;
      }
      const cols = headerCells.length;
      const padded = tableRows.map((r) =>
        r.length === cols ? r : r.concat(Array(Math.max(0, cols - r.length)).fill("")).slice(0, cols),
      );
      const alignPadded = tableAlign.length === cols
        ? tableAlign
        : tableAlign.concat(Array(Math.max(0, cols - tableAlign.length)).fill("left" as const)).slice(0, cols);
      push({ type: "table", text: "", tableRows: padded, tableHeader: true, tableAlign: alignPadded });
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

function indentLevel(line: string): number {
  let spaces = 0;
  for (const ch of line) {
    if (ch === " ") spaces++;
    else if (ch === "\t") spaces += 2;
    else break;
  }
  return Math.floor(spaces / 2);
}

function parseTableAlignment(line: string): Array<"left" | "center" | "right"> {
  const cells = splitTableCells(line);
  return cells.map((c) => {
    const t = c.trim();
    const startsColon = t.startsWith(":");
    const endsColon = t.endsWith(":");
    if (startsColon && endsColon) return "center";
    if (endsColon) return "right";
    return "left";
  });
}

function looksLikeTableRow(line: string): boolean {
  if (!line.includes("|")) return false;
  const stripped = line.replace(/\\\|/g, "");
  return /\|/.test(stripped) && /[^|\s]/.test(stripped);
}

function isTableSeparator(line: string): boolean {
  if (!line.includes("|")) return false;
  const cells = splitTableCells(line);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{3,}:?$/.test(c.trim()));
}

function splitTableCells(line: string): string[] {
  const inner = line.replace(/^\s*\|/, "").replace(/\|\s*$/, "");
  return inner.split("|").map((c) => c.trim());
}
