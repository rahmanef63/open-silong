import { tokenizeInline } from "../../../../shared/lib/inlineMd";

const MARKER_CLS =
  "md-marker text-muted-foreground/50 text-[0.85em] tracking-tight select-none";
/** Heading marker style — chars stay in the DOM (so innerText round-
 *  trips correctly and the stored source keeps `**…**`), but are
 *  rendered at zero font-size + transparent color so the user sees
 *  just the bold text. Heading h1-h4 already paint bold via font-
 *  weight; the markers would be visual noise. */
const HEADING_MARKER_CLS =
  "md-marker text-transparent select-none text-[0px] leading-[0] tracking-[0]";

/** Inline icons for `@`-mention chips — pure SVG (no text nodes) so they never
 *  affect innerText / caret counting. Sized to 1em, painted currentColor. */
const PAGE_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.15em"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`;
const DB_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.15em"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>`;

function makeMarker(text: string, opts?: { hideMarkers?: boolean }): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = opts?.hideMarkers ? HEADING_MARKER_CLS : MARKER_CLS;
  span.dataset.mdMarker = "1";
  span.textContent = text;
  return span;
}

/** Build the decorated DOM for one source line (no `\n`). Pure DOM
 *  construction; no caret math here.
 *
 *  `hideMarkers` (used for headings) keeps markers in the DOM for
 *  innerText round-trip while rendering them invisible. */
export function decorateLineToFragment(line: string, opts?: { hideMarkers?: boolean }): DocumentFragment {
  const frag = document.createDocumentFragment();
  if (!line) return frag;
  const tokens = tokenizeInline(line);
  for (const tok of tokens) {
    switch (tok.kind) {
      case "text":
        frag.appendChild(document.createTextNode(tok.value));
        break;
      case "bold": {
        frag.appendChild(makeMarker("**", opts));
        const strong = document.createElement("strong");
        strong.textContent = tok.inner;
        frag.appendChild(strong);
        frag.appendChild(makeMarker("**", opts));
        break;
      }
      case "italic": {
        // Default to `_` (the marker the toolbar emits).
        frag.appendChild(makeMarker("_", opts));
        const em = document.createElement("em");
        em.textContent = tok.inner;
        frag.appendChild(em);
        frag.appendChild(makeMarker("_", opts));
        break;
      }
      case "strike": {
        frag.appendChild(makeMarker("~~", opts));
        const del = document.createElement("del");
        del.textContent = tok.inner;
        frag.appendChild(del);
        frag.appendChild(makeMarker("~~", opts));
        break;
      }
      case "code": {
        frag.appendChild(makeMarker("`", opts));
        const code = document.createElement("code");
        code.className = "rounded bg-muted/70 px-1 py-0.5 font-mono text-[0.9em]";
        code.textContent = tok.inner;
        frag.appendChild(code);
        frag.appendChild(makeMarker("`", opts));
        break;
      }
      case "math": {
        frag.appendChild(makeMarker("$", opts));
        const span = document.createElement("span");
        span.className = "font-mono text-[0.95em] text-foreground/90";
        span.textContent = tok.inner;
        frag.appendChild(span);
        frag.appendChild(makeMarker("$", opts));
        break;
      }
      case "link": {
        const isPage = /^\/(?:dashboard\/)?p\/[A-Za-z0-9_-]+/.test(tok.href);
        const isDb = /^\/(?:dashboard\/)?db\/[A-Za-z0-9_-]+/.test(tok.href);
        if (isPage || isDb) {
          // Page/DB mention → inline chip: [icon] label. The `[`, `](`, url, `)`
          // stay in the DOM at 0px (innerText === source → caret parity) and a
          // non-text SVG icon is prepended (adds no text). The label carries
          // data-href so BlockEditor's onContentClick navigates on click.
          const chip = document.createElement("span");
          // Atomic: the browser refuses to place the caret inside a
          // contentEditable=false island, so a `@` / char typed against the
          // chip lands in a sibling text node after `)` instead of being
          // absorbed into the hidden url span (which broke the mention
          // trigger + corrupted the source on a 2nd mention). innerText still
          // round-trips the chip's text, so source parity is preserved.
          chip.setAttribute("contenteditable", "false");
          // MUST stay `inline` (not inline-flex). The source of truth is
          // `el.innerText`, and Chromium's innerText inserts a `\n` between
          // every flex item — so an inline-flex chip shreds `[label](url)`
          // into 6 newline-separated lines on read-back, corrupting the
          // stored source and breaking a 2nd mention. Plain inline concatenates.
          chip.className =
            "mention-chip inline rounded px-1 bg-brand/10 text-brand no-underline";
          const ico = document.createElement("span");
          ico.contentEditable = "false";
          ico.setAttribute("aria-hidden", "true");
          ico.className = "mention-ico select-none mr-1";
          ico.innerHTML = isDb ? DB_ICON_SVG : PAGE_ICON_SVG;
          chip.appendChild(ico);
          chip.appendChild(makeMarker("[", { hideMarkers: true }));
          const label = document.createElement("span");
          label.className = "cursor-pointer font-medium";
          label.textContent = tok.label;
          label.dataset.href = tok.href;
          chip.appendChild(label);
          chip.appendChild(makeMarker("](", { hideMarkers: true }));
          const url = document.createElement("span");
          url.className = "text-transparent text-[0px] leading-[0] select-none";
          url.textContent = tok.href;
          chip.appendChild(url);
          chip.appendChild(makeMarker(")", { hideMarkers: true }));
          frag.appendChild(chip);
          break;
        }
        // Generic link (external / other) — styled label, dim markers. Label
        // carries data-href; BlockEditor's onContentClick navigates on click.
        frag.appendChild(makeMarker("[", opts));
        const a = document.createElement("span");
        a.className = "text-brand underline decoration-brand/40 underline-offset-2 cursor-pointer";
        a.textContent = tok.label;
        a.dataset.href = tok.href;
        frag.appendChild(a);
        frag.appendChild(makeMarker("](", opts));
        const href = document.createElement("span");
        href.className = opts?.hideMarkers
          ? "text-transparent text-[0px] leading-[0]"
          : "text-muted-foreground/60 text-[0.85em]";
        href.textContent = tok.href;
        frag.appendChild(href);
        frag.appendChild(makeMarker(")", opts));
        break;
      }
      case "wikilink": {
        // `[[title]]` / `[[title|alias]]` — brackets + pipe as dim markers,
        // title/alias in link color. EVERY source char stays in the DOM
        // (raw untrimmed title/alias) so innerText === source: the marker
        // spans reproduce `[[`, `|`, `]]` verbatim.
        frag.appendChild(makeMarker("[[", opts));
        const title = document.createElement("span");
        title.className = "text-brand underline decoration-brand/40 underline-offset-2";
        title.textContent = tok.title;
        frag.appendChild(title);
        if (tok.alias !== undefined) {
          frag.appendChild(makeMarker("|", opts));
          const alias = document.createElement("span");
          alias.className = "text-brand underline decoration-brand/40 underline-offset-2";
          alias.textContent = tok.alias;
          frag.appendChild(alias);
        }
        frag.appendChild(makeMarker("]]", opts));
        break;
      }
      case "tag": {
        // `#tag` pill — the `#` and the tag path live in ONE text node so
        // innerText contributes exactly `#tag` (caret parity). Pure visual
        // styling; no characters added or removed.
        const pill = document.createElement("span");
        pill.className = "rounded bg-brand/10 px-1 font-medium text-brand";
        pill.textContent = "#" + tok.tag;
        frag.appendChild(pill);
        break;
      }
    }
  }
  return frag;
}
