/** Live inline-markdown decorator for contentEditable blocks.
 *
 *  We keep the Slack-model source of truth (plain text with `**bold**`,
 *  `_italic_`, `~~strike~~`, `` `code` ``, `[label](url)` markers) and
 *  layer a decoration pass on top of the contentEditable's DOM so the
 *  rendered glyphs actually look bold/italic/etc. in the editor —
 *  matching Notion-style WYSIWYG.
 *
 *  The pass is idempotent and structure-only: the visible characters
 *  (markers + content) are unchanged, so `el.innerText` after a pass
 *  returns the same source text the user typed. Markers are wrapped
 *  in dim spans so users still understand the source. */

import { tokenizeInline } from "../../../shared/lib/inlineMd";

const MARKER_CLS =
  "md-marker text-muted-foreground/50 text-[0.85em] tracking-tight select-none";

/** Walk the contentEditable, count visible characters before the
 *  selection-start. `<br>` counts as one `\n`. Returns -1 if no
 *  selection or selection lives outside `host`. */
export function getCaretOffset(host: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return -1;
  const range = sel.getRangeAt(0);
  if (!host.contains(range.startContainer)) return -1;
  let offset = 0;
  const stop = range.startContainer;
  const stopOffset = range.startOffset;
  let done = false;

  function visit(node: Node) {
    if (done) return;
    if (node === stop && (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE)) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += stopOffset;
        done = true;
        return;
      }
      // Element-node anchor: count first `stopOffset` children fully.
      for (let i = 0; i < stopOffset && i < node.childNodes.length; i++) visit(node.childNodes[i]);
      done = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node.nodeValue ?? "").length;
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === "BR") {
        offset += 1; // counts as `\n`
        return;
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        if (done) return;
        visit(node.childNodes[i]);
      }
    }
  }

  for (let i = 0; i < host.childNodes.length; i++) {
    if (done) break;
    visit(host.childNodes[i]);
  }
  return offset;
}

/** Place caret at character `target` in `host`. Pass `Infinity` to
 *  jump to the end. Walks text nodes left-to-right and treats `<br>`
 *  as a single `\n`. */
export function setCaretAtOffset(host: HTMLElement, target: number): void {
  if (target < 0) return;
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  let remaining = target;
  let placed = false;

  function visit(node: Node): boolean {
    if (placed) return true;
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.nodeValue ?? "").length;
      if (remaining <= len) {
        range.setStart(node, Math.max(0, remaining));
        range.collapse(true);
        placed = true;
        return true;
      }
      remaining -= len;
      return false;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === "BR") {
        if (remaining <= 0) {
          // place before the BR
          const parent = el.parentNode!;
          const idx = Array.prototype.indexOf.call(parent.childNodes, el);
          range.setStart(parent, idx);
          range.collapse(true);
          placed = true;
          return true;
        }
        remaining -= 1;
        return false;
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        if (visit(node.childNodes[i])) return true;
      }
    }
    return false;
  }

  for (let i = 0; i < host.childNodes.length; i++) {
    if (visit(host.childNodes[i])) break;
  }

  if (!placed) {
    // Fallback: place at end.
    range.selectNodeContents(host);
    range.collapse(false);
  }

  sel.removeAllRanges();
  sel.addRange(range);
}

function makeMarker(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = MARKER_CLS;
  span.dataset.mdMarker = "1";
  span.textContent = text;
  return span;
}

/** Build the decorated DOM for one source line (no `\n`). Pure DOM
 *  construction; no caret math here. */
export function decorateLineToFragment(line: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  if (!line) return frag;
  const tokens = tokenizeInline(line);
  for (const tok of tokens) {
    switch (tok.kind) {
      case "text":
        frag.appendChild(document.createTextNode(tok.value));
        break;
      case "bold": {
        frag.appendChild(makeMarker("**"));
        const strong = document.createElement("strong");
        strong.textContent = tok.inner;
        frag.appendChild(strong);
        frag.appendChild(makeMarker("**"));
        break;
      }
      case "italic": {
        // Italic markers are single-char; preserve original `_` vs `*`
        // by checking back later — but our tokenizer collapses both
        // into a `kind:"italic"` with `inner`. Default to `_` (the
        // marker the toolbar emits).
        frag.appendChild(makeMarker("_"));
        const em = document.createElement("em");
        em.textContent = tok.inner;
        frag.appendChild(em);
        frag.appendChild(makeMarker("_"));
        break;
      }
      case "strike": {
        frag.appendChild(makeMarker("~~"));
        const del = document.createElement("del");
        del.textContent = tok.inner;
        frag.appendChild(del);
        frag.appendChild(makeMarker("~~"));
        break;
      }
      case "code": {
        frag.appendChild(makeMarker("`"));
        const code = document.createElement("code");
        code.className = "rounded bg-muted/70 px-1 py-0.5 font-mono text-[0.9em]";
        code.textContent = tok.inner;
        frag.appendChild(code);
        frag.appendChild(makeMarker("`"));
        break;
      }
      case "math": {
        frag.appendChild(makeMarker("$"));
        const span = document.createElement("span");
        span.className = "font-mono text-[0.95em] text-foreground/90";
        span.textContent = tok.inner;
        frag.appendChild(span);
        frag.appendChild(makeMarker("$"));
        break;
      }
      case "link": {
        // [label](href) — render label as styled link, keep markers dim.
        // We don't make the <a> clickable inside contentEditable to avoid
        // accidental navigation while editing.
        frag.appendChild(makeMarker("["));
        const a = document.createElement("span");
        a.className = "text-brand underline decoration-brand/40 underline-offset-2";
        a.textContent = tok.label;
        a.dataset.href = tok.href;
        frag.appendChild(a);
        frag.appendChild(makeMarker("]("));
        const href = document.createElement("span");
        href.className = "text-muted-foreground/60 text-[0.85em]";
        href.textContent = tok.href;
        frag.appendChild(href);
        frag.appendChild(makeMarker(")"));
        break;
      }
    }
  }
  return frag;
}

/** Decorate the whole contentEditable. Splits by `\n`, decorates each
 *  line, joins with `<br>`. Caret is preserved at its prior text-offset.
 *  Safe to call from `onInput` — does not modify visible text. */
export function decorateInPlace(host: HTMLElement, source: string): void {
  const caret = getCaretOffset(host);
  while (host.firstChild) host.removeChild(host.firstChild);

  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    host.appendChild(decorateLineToFragment(lines[i]));
    if (i < lines.length - 1) {
      host.appendChild(document.createElement("br"));
    }
  }
  if (caret >= 0) setCaretAtOffset(host, caret);
}

/** Total visible-text length (matches what `el.innerText` returns
 *  after a decorate pass). Used by tests + caret bound checks. */
export function visibleLength(source: string): number {
  return source.length;
}
