"use client";

import * as React from "react";
import { Bold, Italic, Code, Strikethrough, Link2, Sparkles, Loader2, Eraser } from "lucide-react";
import { useAction } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { cn } from "@/shared/lib/utils";
import { reportError } from "@/shared/lib/error";

type Mark = "bold" | "italic" | "strike" | "code" | "link";

type AIPreset = "improve" | "shorter" | "longer" | "grammar" | "translate";

const AI_PROMPTS: Record<AIPreset, { label: string; system: string; build: (sel: string) => string }> = {
  improve: {
    label: "Improve writing",
    system: "Rewrite the user's text to read more clearly and concisely while preserving meaning. Output only the rewritten text — no commentary, no quotes, no markdown wrappers.",
    build: (s) => s,
  },
  shorter: {
    label: "Make shorter",
    system: "Shorten the user's text while preserving its meaning. Output only the shortened text — no commentary.",
    build: (s) => s,
  },
  longer: {
    label: "Make longer",
    system: "Expand the user's text with relevant detail while preserving its meaning. Output only the expanded text — no commentary.",
    build: (s) => s,
  },
  grammar: {
    label: "Fix grammar & spelling",
    system: "Correct grammar and spelling in the user's text. Preserve voice, meaning, and formatting. Output only the corrected text — no commentary.",
    build: (s) => s,
  },
  translate: {
    label: "Translate to English",
    system: "Translate the user's text to English. If it is already English, translate to Indonesian instead. Output only the translation — no commentary.",
    build: (s) => s,
  },
};

const WRAP: Record<Exclude<Mark, "link">, [string, string]> = {
  bold: ["**", "**"],
  italic: ["_", "_"],
  strike: ["~~", "~~"],
  code: ["`", "`"],
};

/** Floating toolbar over a text selection inside any contentEditable.
 *  Wraps the selected text with markdown markers in-place. The editor
 *  reads `innerText` so the markers persist as plain text — readers
 *  (public share view, exports) parse them via `inlineMd` and render
 *  formatted output. */
export function SelectionToolbar() {
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiPending, setAiPending] = React.useState(false);
  const rangeRef = React.useRef<Range | null>(null);
  const applyRef = React.useRef<(m: Mark) => void>(() => {});
  const complete = useAction(api.ai.chat.complete);

  React.useEffect(() => {
    function update() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPos(null);
        rangeRef.current = null;
        return;
      }
      const range = sel.getRangeAt(0);
      const ce = closestContentEditable(range.startContainer);
      if (!ce || ce !== closestContentEditable(range.endContainer)) {
        setPos(null);
        rangeRef.current = null;
        return;
      }
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPos(null);
        rangeRef.current = null;
        return;
      }
      rangeRef.current = range.cloneRange();
      setPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    function onKey(e: KeyboardEvent) {
      // Only intercept when there's a live selection inside an editable.
      if (!rangeRef.current) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      let mark: Mark | null = null;
      if (k === "b") mark = "bold";
      else if (k === "i") mark = "italic";
      else if (k === "e") mark = "code";
      else if (k === "k" && e.shiftKey) mark = "link";
      else if (k === "x" && e.shiftKey) mark = "strike";
      if (!mark) return;
      e.preventDefault();
      applyRef.current(mark);
    }
    document.addEventListener("selectionchange", update);
    document.addEventListener("scroll", update, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("scroll", update, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", update);
    };
  }, []);

  const apply = React.useCallback((mark: Mark) => {
    const range = rangeRef.current;
    if (!range) return;
    const ce = closestContentEditable(range.startContainer);
    if (!ce) return;
    const selected = range.toString();
    if (mark === "link") {
      const url = window.prompt("Link URL", "https://");
      if (!url) return;
      const wrapped = `[${selected || "link"}](${url})`;
      replaceRange(range, wrapped, ce);
      return;
    }
    const [open, close] = WRAP[mark];
    const wrapped = `${open}${selected}${close}`;
    replaceRange(range, wrapped, ce);
  }, []);
  applyRef.current = apply;

  const clearFormatting = React.useCallback(() => {
    const range = rangeRef.current;
    if (!range) return;
    const ce = closestContentEditable(range.startContainer);
    if (!ce) return;
    const selected = range.toString();
    if (!selected) return;
    replaceRange(range, stripMd(selected), ce);
  }, []);

  const applyAI = React.useCallback(async (preset: AIPreset) => {
    const range = rangeRef.current;
    if (!range || aiPending) return;
    const ce = closestContentEditable(range.startContainer);
    if (!ce) return;
    const selected = range.toString().trim();
    if (!selected) return;
    setAiPending(true);
    setAiOpen(false);
    try {
      const cfg = AI_PROMPTS[preset];
      const res = await complete({
        messages: [{ role: "user", content: cfg.build(selected) }],
        system: cfg.system,
        maxTokens: 1024,
      });
      const next = (res.text ?? "").trim();
      if (!next) {
        toast.error("AI returned an empty response.");
        return;
      }
      replaceRange(range, next, ce);
      toast.success(cfg.label + " — done");
    } catch (err) {
      const safe = reportError("SelectionToolbar.AI", err);
      toast.error(safe.message);
    } finally {
      setAiPending(false);
    }
  }, [complete, aiPending]);

  if (!pos) return null;

  return (
    <div
      role="toolbar"
      style={{
        position: "fixed",
        left: pos.x,
        top: Math.max(8, pos.y - 44),
        transform: "translateX(-50%)",
        zIndex: 50,
      }}
      className={cn(
        "flex items-center gap-0.5 rounded-md border border-border bg-popover/95 p-0.5 shadow-soft backdrop-blur",
      )}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Btn label="Bold (Cmd/Ctrl+B)" onClick={() => apply("bold")}><Bold className="h-3.5 w-3.5" /></Btn>
      <Btn label="Italic (Cmd/Ctrl+I)" onClick={() => apply("italic")}><Italic className="h-3.5 w-3.5" /></Btn>
      <Btn label="Strike-through (Cmd/Ctrl+Shift+X)" onClick={() => apply("strike")}><Strikethrough className="h-3.5 w-3.5" /></Btn>
      <Btn label="Inline code (Cmd/Ctrl+E)" onClick={() => apply("code")}><Code className="h-3.5 w-3.5" /></Btn>
      <Btn label="Link (Cmd/Ctrl+Shift+K)" onClick={() => apply("link")}><Link2 className="h-3.5 w-3.5" /></Btn>
      <Btn label="Clear formatting" onClick={clearFormatting}><Eraser className="h-3.5 w-3.5" /></Btn>
      <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
      <div className="relative">
        <Btn
          label={aiPending ? "AI working…" : "AI actions"}
          onClick={() => setAiOpen((o) => !o)}
        >
          {aiPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        </Btn>
        {aiOpen && !aiPending && (
          <div
            className="absolute left-1/2 top-full mt-1 w-44 -translate-x-1/2 overflow-hidden rounded-md border border-border bg-popover/95 shadow-soft backdrop-blur"
            onMouseDown={(e) => e.preventDefault()}
          >
            {(Object.keys(AI_PROMPTS) as AIPreset[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => applyAI(k)}
                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-accent"
              >
                {AI_PROMPTS[k].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Btn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function stripMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/(^|\W)_([^_]+?)_(?=\W|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^\s)]+\)/g, "$1");
}

function closestContentEditable(node: Node | null): HTMLElement | null {
  let cur: Node | null = node;
  while (cur) {
    if (cur instanceof HTMLElement && cur.isContentEditable) return cur;
    cur = cur.parentNode;
  }
  return null;
}

function replaceRange(range: Range, text: string, host: HTMLElement) {
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  // Collapse caret to end of inserted text so the user can keep typing.
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    const r = document.createRange();
    r.setStartAfter(host.lastChild ?? host);
    r.collapse(true);
    sel.addRange(r);
  }
  // Trigger React's onInput so the editor saves.
  host.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText" }));
}
