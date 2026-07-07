/** Lightweight inline-markdown renderer for read-only surfaces (public
 *  share view, exports). Editor input remains plain text — markers are
 *  source-of-truth.
 *
 *  Supported:
 *    **bold**          → <strong>
 *    *italic* / _it_   → <em>
 *    ~~strike~~        → <del>
 *    `code`            → <code>
 *    [label](url)      → <a>  (http/https only)
 *    bare http(s)://…  → <a>
 *
 *  Greedy left-to-right, no nesting beyond one level — sufficient for the
 *  90% block-editor case. Returns React children, not HTML strings, so
 *  there is no XSS surface. */

import * as React from "react";
import katex from "katex";
import { WIKILINK_RE, TAG_RE, slug } from "./graphLinks";
import { ROUTES_ABS, ROUTE_BASE } from "./routes";

/** Strip inline-markdown markers from a plain-text source. Inverse of
 *  the wrap-with-marker behavior in `SelectionToolbar`. Used by the
 *  toolbar's eraser button. Pure — testable without DOM. */
export function stripMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/(^|\W)_([^_]+?)_(?=\W|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^\s)]+\)/g, "$1");
}

const BOLD = /\*\*([^*\n]+)\*\*/;
const STRIKE = /~~([^~\n]+)~~/;
const CODE = /`([^`\n]+)`/;
const ITALIC = /(?:\*([^*\n]+)\*|_([^_\n]+)_)/;
// Inline math `$...$` — single-dollar form, no whitespace right after `$`.
const MATH = /\$([^$\n]+)\$/;
// Allow relative `/path` for internal mentions in addition to http(s).
// `javascript:` and other dangerous schemes are excluded by anchoring
// to `https?://` or `/`.
const LINK_MD = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/;
const BARE_URL = /(https?:\/\/[^\s)]+)/;
// Wikilink + tag reuse the edge-extractor's regex SOURCE (SSOT in graphLinks)
// but drop the /g flag: the tokenizer does single-match `String.match`, which
// needs `.index` + capture groups that a global regex does not return.
const WIKILINK = new RegExp(WIKILINK_RE.source);
const TAG = new RegExp(TAG_RE.source);

type Token =
  | { kind: "text"; value: string }
  | { kind: "bold" | "italic" | "strike" | "code" | "math"; inner: string }
  | { kind: "link"; label: string; href: string }
  // `title`/`alias` stay RAW (untrimmed) so the WYSIWYG decorator can
  // reconstruct the exact source `[[title]]` / `[[title|alias]]` and keep
  // innerText === stored source for caret parity. renderInline trims for
  // display/resolution.
  | { kind: "wikilink"; title: string; alias?: string }
  | { kind: "tag"; tag: string };

/** Tokenise a single line. Order matters: code first to swallow markers
 *  inside backticks, then bold (longer marker than italic), strike, italic,
 *  links, bare urls. */
export function tokenizeInline(input: string): Token[] {
  if (!input) return [];
  const out: Token[] = [];
  let buf = input;
  while (buf.length > 0) {
    const matches: Array<{ idx: number; len: number; tok: Token }> = [];
    push(matches, buf.match(CODE), (m) => ({ kind: "code", inner: m[1] }));
    push(matches, buf.match(MATH), (m) => ({ kind: "math", inner: m[1] }));
    push(matches, buf.match(BOLD), (m) => ({ kind: "bold", inner: m[1] }));
    push(matches, buf.match(STRIKE), (m) => ({ kind: "strike", inner: m[1] }));
    push(matches, buf.match(ITALIC), (m) => ({ kind: "italic", inner: m[1] ?? m[2] }));
    push(matches, buf.match(LINK_MD), (m) => ({ kind: "link", label: m[1], href: m[2] }));
    push(matches, buf.match(BARE_URL), (m) => ({ kind: "link", label: m[1], href: m[1] }));
    push(matches, buf.match(WIKILINK), (m) => ({ kind: "wikilink", title: m[1] ?? "", alias: m[2] }));
    pushTag(matches, buf.match(TAG));

    if (matches.length === 0) {
      out.push({ kind: "text", value: buf });
      break;
    }
    matches.sort((a, b) => a.idx - b.idx);
    const first = matches[0];
    if (first.idx > 0) out.push({ kind: "text", value: buf.slice(0, first.idx) });
    out.push(first.tok);
    buf = buf.slice(first.idx + first.len);
  }
  return out;
}

function push(
  out: Array<{ idx: number; len: number; tok: Token }>,
  m: RegExpMatchArray | null,
  build: (m: RegExpMatchArray) => Token,
) {
  if (m && m.index !== undefined) {
    out.push({ idx: m.index, len: m[0].length, tok: build(m) });
  }
}

/** TAG_RE consumes an optional leading whitespace (`(?:^|\s)`) before `#`.
 *  The token must cover ONLY `#tag` so the preceding space stays in its own
 *  text run — otherwise the decorator would swallow it and innerText would
 *  drift from the stored source. */
function pushTag(
  out: Array<{ idx: number; len: number; tok: Token }>,
  m: RegExpMatchArray | null,
) {
  if (m && m.index !== undefined) {
    const hashOffset = m[0].indexOf("#"); // 0 (^) or 1 (whitespace)
    out.push({
      idx: m.index + hashOffset,
      len: m[0].length - hashOffset,
      tok: { kind: "tag", tag: m[1] },
    });
  }
}

export interface InlineRenderOptions {
  /** Pages available for `[[wikilink]]` title→id resolution (matched by
   *  `slug(title)`). When omitted (e.g. the public share view, which only
   *  has one page's blocks), wikilinks render as unresolved "ghost" spans. */
  pages?: ReadonlyArray<{ id: string; title: string }>;
}

/** Build a `slug(title) → pageId` map for wikilink resolution. First title
 *  wins on collision (Obsidian disambiguates with a picker; we keep it
 *  deterministic and fall back to ghost styling elsewhere). */
function buildTitleResolver(pages: ReadonlyArray<{ id: string; title: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of pages) {
    const key = slug(p.title || "");
    if (key && !map.has(key)) map.set(key, p.id);
  }
  return map;
}

/** Render the tokens as React children. Pass `opts.pages` to resolve
 *  `[[wikilinks]]` to real page routes. */
export function renderInline(input: string, opts?: InlineRenderOptions): React.ReactNode {
  const tokens = tokenizeInline(input);
  const resolve = opts?.pages ? buildTitleResolver(opts.pages) : undefined;
  return tokens.map((t, i) => {
    switch (t.kind) {
      case "text":
        return <React.Fragment key={i}>{t.value}</React.Fragment>;
      case "bold":
        return <strong key={i}>{t.inner}</strong>;
      case "italic":
        return <em key={i}>{t.inner}</em>;
      case "strike":
        return <del key={i}>{t.inner}</del>;
      case "code":
        return <code key={i} className="rounded bg-muted/70 px-1 py-0.5 font-mono text-[0.9em]">{t.inner}</code>;
      case "math": {
        const html = katex.renderToString(t.inner, { throwOnError: false, displayMode: false });
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      }
      case "link": {
        const internal = t.href.startsWith("/");
        return (
          <a
            key={i}
            href={t.href}
            target={internal ? undefined : "_blank"}
            rel={internal ? undefined : "noopener noreferrer nofollow"}
            className="text-brand underline-offset-2 hover:underline"
          >
            {t.label}
          </a>
        );
      }
      case "wikilink": {
        const title = t.title.trim();
        const display = (t.alias ?? "").trim() || title;
        const id = resolve?.get(slug(title));
        if (id) {
          return (
            <a
              key={i}
              href={ROUTES_ABS.page(id)}
              className="text-brand underline-offset-2 hover:underline"
            >
              {display}
            </a>
          );
        }
        return (
          <span
            key={i}
            title="Unresolved link"
            className="text-brand/60 underline decoration-dashed decoration-brand/40 underline-offset-2"
          >
            {display}
          </span>
        );
      }
      case "tag":
        return (
          <a
            key={i}
            href={`${ROUTE_BASE}/graph?tag=${encodeURIComponent(t.tag)}`}
            className="rounded bg-brand/10 px-1.5 py-0.5 text-[0.85em] font-medium text-brand hover:bg-brand/20"
          >
            #{t.tag}
          </a>
        );
    }
  });
}
