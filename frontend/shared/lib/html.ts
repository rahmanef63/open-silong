/** Page → semantic HTML exporter. Targets Notion's HTML import surface:
 *
 *  > HTML headings map to Notion headings (H4+ becomes H3).
 *  > Lists and paragraphs map to Notion list and text blocks.
 *
 *  Block coverage (all 28 Nosion block types):
 *    paragraph/h1-h4    → <p> / <h1>-<h4>
 *    todo               → <ul><li>[x]/[ ] …</li>  (Notion → bullet on import)
 *    bullet/numbered    → <ul><li> / <ol><li>
 *    quote              → <blockquote>
 *    callout            → <blockquote> with 💡 prefix (Notion has no callout)
 *    code               → <pre><code class="lang-X">
 *    divider            → <hr>
 *    image              → <img src alt> + <figcaption> if caption
 *    audio/video        → <audio>/<video controls src>
 *    page               → <a href> (Notion → page link)
 *    database           → <p>[Database: name] marker
 *    columns2-5         → <div class="columns"> flex layout
 *    toggle             → <details><summary>
 *    synced             → block content inline
 *    toc                → <nav> (skipped — derived at view-time)
 *    equation           → <pre>$$ …$$</pre>
 *    table              → <table><tr><td>
 *    embed              → <iframe> or <a> fallback
 *    button             → <a class="button">
 */

import type { Block, Page } from "../types/domain";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TABLE_ROW_DELIM = "\n";
const TABLE_CELL_DELIM = "|";

export function blockToHtml(b: Block): string {
  const t = escape(b.text ?? "");
  switch (b.type) {
    case "paragraph": return `<p>${t}</p>`;
    case "h1": return `<h1>${t}</h1>`;
    case "h2": return `<h2>${t}</h2>`;
    case "h3": return `<h3>${t}</h3>`;
    case "h4": return `<h4>${t}</h4>`;
    case "todo": return `<ul><li>[${b.checked ? "x" : " "}] ${t}</li></ul>`;
    case "bullet": return `<ul><li>${t}</li></ul>`;
    case "numbered": return `<ol><li>${t}</li></ol>`;
    case "quote": return `<blockquote>${t}</blockquote>`;
    case "callout": return `<blockquote>💡 ${t}</blockquote>`;
    case "code": {
      const lang = b.lang ? ` class="lang-${escape(b.lang)}"` : "";
      return `<pre><code${lang}>${t}</code></pre>`;
    }
    case "divider": return `<hr>`;
    case "image": {
      if (!b.url) return "";
      const cap = b.caption ? `<figcaption>${escape(b.caption)}</figcaption>` : "";
      return `<figure><img src="${escape(b.url)}" alt="${escape(b.caption ?? "")}">${cap}</figure>`;
    }
    case "audio":
      return b.url ? `<audio controls src="${escape(b.url)}"></audio>` : "";
    case "video":
      return b.url ? `<video controls src="${escape(b.url)}"></video>` : "";
    case "embed":
      return b.url
        ? `<p><a href="${escape(b.url)}" target="_blank" rel="noopener">${escape(b.url)}</a></p>`
        : "";
    case "button":
      return `<p><a class="button" href="${escape((b as { url?: string }).url ?? "#")}">${t || "Button"}</a></p>`;
    case "equation":
      return `<pre>$$${t}$$</pre>`;
    case "table": {
      const rows = (b.text ?? "").split(TABLE_ROW_DELIM).filter(Boolean);
      const html = rows
        .map((row) => {
          const cells = row.split(TABLE_CELL_DELIM).map((c) => `<td>${escape(c.trim())}</td>`).join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<table>${html}</table>`;
    }
    case "page":
      return `<p><a href="#page-${escape(b.pageId ?? "")}">${t || "Subpage"}</a></p>`;
    case "database":
      return `<p>[Database: ${t || "embedded"}]</p>`;
    case "toggle": {
      const head = `<summary>${t}</summary>`;
      const body = (b.children ?? []).map(blockToHtml).filter(Boolean).join("");
      return `<details>${head}${body}</details>`;
    }
    case "columns2":
    case "columns3":
    case "columns4":
    case "columns5": {
      const cols = (b.columns ?? [])
        .map((col) => `<div class="column">${col.map(blockToHtml).filter(Boolean).join("")}</div>`)
        .join("");
      return `<div class="columns">${cols}</div>`;
    }
    case "synced":
      return `<div class="synced">${t}</div>`;
    case "toc":
      return ""; // Derived at view time — Notion will regenerate its own.
    default:
      return `<p>${t}</p>`;
  }
}

const HTML_STYLE = `
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:48rem;margin:0 auto;padding:2rem;color:#111;line-height:1.6}
h1,h2,h3,h4{margin-top:1.5em;margin-bottom:.4em;line-height:1.25}
hr{border:0;border-top:1px solid #e5e5e5;margin:1.5em 0}
pre{background:#f3f4f6;padding:.75em 1em;border-radius:6px;overflow-x:auto}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em}
blockquote{border-left:4px solid #d1d5db;padding-left:1em;margin-left:0;color:#4b5563}
.columns{display:flex;gap:1rem;align-items:flex-start}
.column{flex:1;min-width:0}
table{border-collapse:collapse;width:100%;margin:1em 0}
td{border:1px solid #d1d5db;padding:.5em .75em;vertical-align:top}
figure{margin:1em 0}
img,video,audio{max-width:100%}
.button{display:inline-block;background:#111;color:#fff;padding:.5em 1em;border-radius:6px;text-decoration:none}
details{margin:.5em 0}summary{cursor:pointer;font-weight:600}
`.trim();

export function pageToHtml(page: Page, includeStyles = true): string {
  const title = escape(page.title || "Untitled");
  const body = page.blocks.map(blockToHtml).filter(Boolean).join("\n");
  const head = `<title>${title}</title>${includeStyles ? `<style>${HTML_STYLE}</style>` : ""}`;
  return `<!doctype html><html><head><meta charset="utf-8">${head}</head><body><h1>${title}</h1>\n${body}</body></html>`;
}

/** Inline fragment — no <html>/<head>, just block elements. Used by
 *  multi-format clipboard so paste targets (Notion / Google Docs)
 *  receive a semantic snippet not a full document. */
export function pageToHtmlFragment(page: Page): string {
  const title = escape(page.title || "Untitled");
  const body = page.blocks.map(blockToHtml).filter(Boolean).join("\n");
  return `<h1>${title}</h1>\n${body}`;
}
