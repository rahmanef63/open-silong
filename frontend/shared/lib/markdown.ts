import { Block, Page } from "../types";
import { uid } from "./uid";

export function blockToMarkdown(b: Block, depth = 0): string {
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
      const body = (b.children ?? []).map(c => blockToMarkdown(c, depth + 1)).join("\n");
      return `${head}\n\n${body}\n\n${indent}</details>`;
    }
    case "columns2":
    case "columns3":
    case "columns4":
    case "columns5":
      return (b.columns ?? []).flatMap(col => col.map(c => blockToMarkdown(c, depth))).join("\n\n");
    case "page":
      return `${indent}[📄 ${b.text || "Subpage"}](#page-${b.pageId ?? ""})`;
    case "database":
      return `${indent}[🗂️ ${b.text || "Database"}](#db-${b.databaseId ?? ""})`;
    case "synced":
      return `${indent}${b.text ?? ""}`;
    case "toc":
      return ""; // Notion re-derives at import time.
    default:
      return `${indent}${b.text ?? ""}`;
  }
}

export function pageToMarkdown(page: Page): string {
  const head = `# ${page.title || "Untitled"}\n\n`;
  return head + page.blocks.map(b => blockToMarkdown(b)).filter(Boolean).join("\n\n");
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

/** Minimal markdown → blocks parser. Each line becomes one block. */
export function markdownToBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let inFence = false;
  let fenceLang = "";
  let fenceBuf: string[] = [];

  const push = (b: Partial<Block> & { type: Block["type"]; text: string }) =>
    blocks.push({ id: uid(), ...b });

  for (const raw of lines) {
    if (inFence) {
      if (raw.trim().startsWith("```")) {
        push({ type: "code", text: fenceBuf.join("\n"), lang: fenceLang });
        inFence = false;
        fenceLang = "";
        fenceBuf = [];
      } else {
        fenceBuf.push(raw);
      }
      continue;
    }
    const line = raw;
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inFence = true;
      fenceLang = trimmed.slice(3).trim();
      continue;
    }
    if (trimmed === "---" || trimmed === "***") { push({ type: "divider", text: "" }); continue; }
    if (trimmed.startsWith("# ")) { push({ type: "h1", text: trimmed.slice(2) }); continue; }
    if (trimmed.startsWith("## ")) { push({ type: "h2", text: trimmed.slice(3) }); continue; }
    if (trimmed.startsWith("### ")) { push({ type: "h3", text: trimmed.slice(4) }); continue; }
    if (/^- \[( |x)\] /.test(trimmed)) {
      const checked = trimmed[3] === "x";
      push({ type: "todo", text: trimmed.slice(6), checked });
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      push({ type: "bullet", text: trimmed.slice(2) });
      continue;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      push({ type: "numbered", text: trimmed.replace(/^\d+\.\s+/, "") });
      continue;
    }
    if (trimmed.startsWith("> ")) { push({ type: "quote", text: trimmed.slice(2) }); continue; }
    if (trimmed === "") continue;
    push({ type: "paragraph", text: trimmed });
  }

  if (inFence && fenceBuf.length) {
    push({ type: "code", text: fenceBuf.join("\n"), lang: fenceLang });
  }

  return blocks.length ? blocks : [{ id: uid(), type: "paragraph", text: "" }];
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
