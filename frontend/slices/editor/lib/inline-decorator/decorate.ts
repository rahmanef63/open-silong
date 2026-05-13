import { tokenizeInline } from "../../../../shared/lib/inlineMd";

const MARKER_CLS =
  "md-marker text-muted-foreground/50 text-[0.85em] tracking-tight select-none";

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
        // Default to `_` (the marker the toolbar emits).
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
