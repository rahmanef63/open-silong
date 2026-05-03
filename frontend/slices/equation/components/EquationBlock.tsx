import { getErrorMessage } from "@/shared/lib/error";
import { useMemo, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Sigma, Pencil } from "lucide-react";
import type { EquationBlockProps } from "../types";

export function EquationBlock({ text, onText, registerRef }: EquationBlockProps) {
  const [editing, setEditing] = useState(!text);
  const [draft, setDraft] = useState(text);

  const rendered = useMemo(() => {
    if (!text) return "";
    try {
      return katex.renderToString(text, { throwOnError: false, displayMode: true });
    } catch (e: unknown) {
      return `<span class="text-destructive text-sm">LaTeX error: ${getErrorMessage(e, "invalid")}</span>`;
    }
  }, [text]);

  const commit = () => {
    onText(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex-1 rounded-md border border-brand/40 bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Sigma className="h-3 w-3" />
          <span>LaTeX block equation</span>
        </div>
        <textarea
          ref={registerRef as any}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setDraft(text); setEditing(false); }
          }}
          placeholder={"e.g. \\frac{a}{b} = \\sqrt{c^2 + d^2}"}
          className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm font-mono outline-none resize-y min-h-[60px] focus:border-brand"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>⌘+Enter to render • Esc to cancel</span>
          <button onClick={commit} className="rounded bg-foreground text-background px-2 py-0.5">Render</button>
        </div>
        {draft && (
          <div className="rounded border border-border bg-card px-3 py-2 overflow-x-auto">
            <div dangerouslySetInnerHTML={{ __html: safeRender(draft) }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex-1 rounded-md hover:bg-accent/30 transition group/eq cursor-text px-3 py-2 relative"
      onClick={() => { setDraft(text); setEditing(true); }}
      ref={registerRef as any}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setDraft(text); setEditing(true); } }}
    >
      {text ? (
        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: rendered }} />
      ) : (
        <span className="text-sm text-muted-foreground/60 italic">Empty equation — click to edit</span>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setDraft(text); setEditing(true); }}
        className="absolute right-2 top-2 opacity-0 group-hover/eq:opacity-100 rounded p-1 text-muted-foreground hover:bg-accent"
        aria-label="Edit equation"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

function safeRender(src: string): string {
  try {
    return katex.renderToString(src, { throwOnError: false, displayMode: true });
  } catch (e: unknown) {
    return `<span class="text-destructive text-xs">${getErrorMessage(e, "LaTeX error")}</span>`;
  }
}
