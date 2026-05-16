"use client";

import * as React from "react";
import { Bold, Italic, Code, Strikethrough, Link2, Sparkles, Loader2, Eraser } from "lucide-react";
import { useAction } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { cn } from "@/shared/lib/utils";
import { Separator } from "@/shared/ui/separator";
import { Button } from "@/shared/ui/button";
import { reportError } from "@/shared/lib/error";
import { stripMd } from "@/shared/lib/inlineMd";
import { AI_PROMPTS, WRAP, type AIPreset, type Mark } from "./selection-toolbar/types";
import { closestContentEditable, replaceRange } from "./selection-toolbar/range";
import { Btn } from "./selection-toolbar/Btn";

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
      <Separator orientation="vertical" className="mx-0.5 h-4" />
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
