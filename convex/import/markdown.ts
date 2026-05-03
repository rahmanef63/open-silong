/**
 * Tiny markdown → block array converter. Pure (no Convex deps), reusable in
 * both action runtime and tests. Covers the subset Notion exports emit:
 * headings 1–3, paragraphs, bullets, numbered lists, todo, quote, fenced
 * code, divider, images. Anything fancier falls back to paragraph.
 */

export type BlockOut = {
  id: string;
  type:
    | "paragraph" | "h1" | "h2" | "h3"
    | "todo" | "bullet" | "numbered"
    | "quote" | "code" | "divider" | "image";
  text: string;
  checked?: boolean;
  lang?: string;
  url?: string;
  caption?: string;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const mk = (type: BlockOut["type"], text = "", extra: Partial<BlockOut> = {}): BlockOut =>
  ({ id: uid(), type, text, ...extra });

const RE_H1 = /^#\s+(.*)$/;
const RE_H2 = /^##\s+(.*)$/;
const RE_H3 = /^###\s+(.*)$/;
const RE_TODO = /^[-*]\s+\[( |x|X)\]\s+(.*)$/;
const RE_BULLET = /^[-*]\s+(.*)$/;
const RE_NUMBERED = /^\d+\.\s+(.*)$/;
const RE_QUOTE = /^>\s?(.*)$/;
const RE_DIVIDER = /^(-{3,}|\*{3,}|_{3,})\s*$/;
const RE_IMAGE = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/;
const RE_FENCE = /^```\s*([\w-]*)\s*$/;

export function markdownToBlocks(md: string): BlockOut[] {
  const out: BlockOut[] = [];
  const lines = md.replace(/\r\n?/g, "\n").split("\n");

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line === "") { i++; continue; }

    const fence = line.match(RE_FENCE);
    if (fence) {
      const lang = fence[1] || "";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !RE_FENCE.test(lines[i].trimEnd())) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing fence
      out.push(mk("code", buf.join("\n"), { lang }));
      continue;
    }

    if (RE_DIVIDER.test(line)) { out.push(mk("divider")); i++; continue; }

    let m: RegExpMatchArray | null;
    if ((m = line.match(RE_H1))) { out.push(mk("h1", m[1])); i++; continue; }
    if ((m = line.match(RE_H2))) { out.push(mk("h2", m[1])); i++; continue; }
    if ((m = line.match(RE_H3))) { out.push(mk("h3", m[1])); i++; continue; }
    if ((m = line.match(RE_IMAGE))) {
      out.push(mk("image", "", { url: m[2], caption: m[1] }));
      i++; continue;
    }
    if ((m = line.match(RE_TODO))) {
      out.push(mk("todo", m[2], { checked: m[1].toLowerCase() === "x" }));
      i++; continue;
    }
    if ((m = line.match(RE_BULLET))) { out.push(mk("bullet", m[1])); i++; continue; }
    if ((m = line.match(RE_NUMBERED))) { out.push(mk("numbered", m[1])); i++; continue; }
    if ((m = line.match(RE_QUOTE))) { out.push(mk("quote", m[1])); i++; continue; }

    // Default: paragraph collects consecutive non-empty, non-block lines.
    const paraBuf: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i].trimEnd();
      if (next === "") break;
      if (
        RE_H1.test(next) || RE_H2.test(next) || RE_H3.test(next) ||
        RE_TODO.test(next) || RE_BULLET.test(next) || RE_NUMBERED.test(next) ||
        RE_QUOTE.test(next) || RE_DIVIDER.test(next) || RE_IMAGE.test(next) ||
        RE_FENCE.test(next)
      ) break;
      paraBuf.push(next);
      i++;
    }
    out.push(mk("paragraph", paraBuf.join(" ")));
  }

  if (out.length === 0) out.push(mk("paragraph", ""));
  return out;
}

/** HTML → block array. Strip tags into block-level chunks; ignore styling. */
export function htmlToBlocks(html: string): BlockOut[] {
  // Drop script/style entirely.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Normalize block tags to markdown-ish, then reuse the markdown parser.
  const md = cleaned
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/?(h1)[^>]*>/gi, (_m, _t, off, s) => off === s.toLowerCase().indexOf("</h1>", off - 5) ? "\n" : "\n# ")
    .replace(/<h1[^>]*>/gi, "\n# ")
    .replace(/<h2[^>]*>/gi, "\n## ")
    .replace(/<h3[^>]*>/gi, "\n### ")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/?(ul|ol|p|div|section|article|header|footer|main)[^>]*>/gi, "\n")
    .replace(/<blockquote[^>]*>/gi, "\n> ")
    .replace(/<\/blockquote>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n---\n")
    .replace(/<img[^>]*src\s*=\s*"([^"]+)"[^>]*alt\s*=\s*"([^"]*)"[^>]*\/?>/gi, "\n![$2]($1)\n")
    .replace(/<img[^>]*src\s*=\s*"([^"]+)"[^>]*\/?>/gi, "\n![]($1)\n")
    .replace(/<[^>]+>/g, "") // strip remaining tags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");

  return markdownToBlocks(md);
}

/** Minimal CSV parser (handles quoted fields w/ embedded commas + escaped quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuote = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuote) {
      if (c === "\"") {
        if (src[i + 1] === "\"") { field += "\""; i++; }
        else inQuote = false;
      } else field += c;
    } else {
      if (c === "\"") inQuote = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}
