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
        // [label](href) — render label as styled link, keep markers dim.
        // We don't make the <a> clickable inside contentEditable to avoid
        // accidental navigation while editing.
        frag.appendChild(makeMarker("[", opts));
        const a = document.createElement("span");
        a.className = "text-brand underline decoration-brand/40 underline-offset-2";
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
