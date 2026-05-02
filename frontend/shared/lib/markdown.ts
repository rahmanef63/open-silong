import { Block, Page } from "../types";

const uid = () => Math.random().toString(36).slice(2, 10);

export function blockToMarkdown(b: Block, depth = 0): string {
  const indent = "  ".repeat(depth);
  switch (b.type) {
    case "h1": return `${indent}# ${b.text}`;
    case "h2": return `${indent}## ${b.text}`;
    case "h3": return `${indent}### ${b.text}`;
    case "todo": return `${indent}- [${b.checked ? "x" : " "}] ${b.text}`;
    case "bullet": return `${indent}- ${b.text}`;
    case "numbered": return `${indent}1. ${b.text}`;
    case "quote": return `${indent}> ${b.text}`;
    case "callout": return `${indent}> 💡 ${b.text}`;
    case "code": return "```" + (b.lang ?? "") + "\n" + b.text + "\n```";
    case "divider": return "---";
    case "image": return b.url ? `![${b.caption ?? ""}](${b.url})` : "";
    case "toggle": {
      const head = `${indent}<details><summary>${b.text}</summary>`;
      const body = (b.children ?? []).map(c => blockToMarkdown(c, depth + 1)).join("\n");
      return `${head}\n\n${body}\n\n${indent}</details>`;
    }
    case "columns2":
    case "columns3":
      return (b.columns ?? []).flatMap(col => col.map(c => blockToMarkdown(c, depth))).join("\n\n");
    case "page":
    case "database":
      return `${indent}[${b.text || "Embedded"}]`;
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
