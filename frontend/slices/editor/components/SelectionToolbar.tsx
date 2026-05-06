"use client";

import * as React from "react";
import { Bold, Italic, Code, Strikethrough, Link2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type Mark = "bold" | "italic" | "strike" | "code" | "link";

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
  const rangeRef = React.useRef<Range | null>(null);

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
    document.addEventListener("selectionchange", update);
    document.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  const apply = (mark: Mark) => {
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
  };

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
      <Btn label="Strike-through" onClick={() => apply("strike")}><Strikethrough className="h-3.5 w-3.5" /></Btn>
      <Btn label="Inline code" onClick={() => apply("code")}><Code className="h-3.5 w-3.5" /></Btn>
      <Btn label="Link" onClick={() => apply("link")}><Link2 className="h-3.5 w-3.5" /></Btn>
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
