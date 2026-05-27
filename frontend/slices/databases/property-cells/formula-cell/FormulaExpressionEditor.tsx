"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent, type MutableRefObject } from "react";
import { AlertTriangle } from "lucide-react";
import type { Database } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import { getSignature } from "../../lib/formulaEngine/functions";
import type { FormulaError } from "../../lib/formulaEngine/types";
import { getTokenAt, type Token } from "./tokenize";
import { findEnclosingCall } from "./enclosingCall";
import { buildSuggestions, type Suggestion } from "./suggestions";

const MAX_ROWS = 8;

export interface FormulaExpressionEditorRef {
  focus: () => void;
  setCaret: (pos: number, end?: number) => void;
  /** Splice `text` at current caret position. Positions caret at
   *  `insertedEnd + caretOffset` (negative offset positions inside the
   *  insert — e.g. -1 lands between `fn(` and `)`). */
  insertAtCaret: (text: string, caretOffset?: number) => void;
}

export interface FormulaExpressionEditorProps {
  value: string;
  onChange: (next: string) => void;
  db: Database;
  error?: FormulaError | null;
  /** Render as `<textarea>` (column-config) vs `<input>` (cell popover). */
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  /** Submit-on-Enter behaviour: ignored when autocomplete dropdown is open
   *  (Enter accepts the suggestion instead). */
  onEnterSubmit?: () => void;
}

export const FormulaExpressionEditor = forwardRef<FormulaExpressionEditorRef, FormulaExpressionEditorProps>(
  function FormulaExpressionEditor(
    { value, onChange, db, error, multiline, placeholder, className, onEnterSubmit },
    extRef,
  ) {
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const [caret, setCaret] = useState(0);
    const [activeIdx, setActiveIdx] = useState(0);
    const [open, setOpen] = useState(false);

    useImperativeHandle(extRef, () => ({
      focus: () => inputRef.current?.focus(),
      setCaret: (pos, end) => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(pos, end ?? pos);
        setCaret(pos);
      },
      insertAtCaret: (text, caretOffset = 0) => {
        const el = inputRef.current;
        const start = el?.selectionStart ?? value.length;
        const end = el?.selectionEnd ?? value.length;
        const next = value.slice(0, start) + text + value.slice(end);
        onChange(next);
        const newCaret = start + text.length + caretOffset;
        queueMicrotask(() => {
          el?.focus();
          el?.setSelectionRange(newCaret, newCaret);
          setCaret(newCaret);
        });
      },
    }), [value, onChange]);

    // Derive token + suggestions from value + caret.
    const token: Token = useMemo(() => getTokenAt(value, caret), [value, caret]);
    const suggestions: Suggestion[] = useMemo(() => buildSuggestions(token, value, caret, db), [token, value, caret, db]);

    // Signature hint — show when caret sits inside a fn(...) call and the
    // fn name resolves to a known signature. Hidden when the autocomplete
    // dropdown is open (same screen real-estate; dropdown wins).
    const sigHint = useMemo(() => {
      const call = findEnclosingCall(value, caret);
      if (!call) return null;
      const sig = getSignature(call.fnName);
      if (!sig) return null;
      return { name: call.fnName, sig, argIndex: call.argIndex };
    }, [value, caret]);

    // Auto-close dropdown when no suggestions OR prefix evaporates.
    useEffect(() => {
      if (suggestions.length === 0) setOpen(false);
      else if (token.prefix.length >= 1) setOpen(true);
      setActiveIdx(0);
    }, [suggestions, token.prefix]);

    const apply = (sug: Suggestion) => {
      const next = value.slice(0, token.start) + sug.insert + value.slice(caret);
      const newCaret = token.start + sug.insert.length + (sug.caretOffset ?? 0);
      onChange(next);
      queueMicrotask(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(newCaret, newCaret);
        setCaret(newCaret);
      });
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (open && suggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIdx((i) => (i + 1) % suggestions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          apply(suggestions[activeIdx]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setOpen(false);
          return;
        }
      } else if (e.key === "Enter" && !multiline && onEnterSubmit) {
        // Single-line submit-on-Enter (matches the legacy input behaviour).
        e.preventDefault();
        onEnterSubmit();
      }
    };

    const onSelOrChange = () => {
      const el = inputRef.current;
      if (!el) return;
      setCaret(el.selectionStart ?? 0);
    };

    // Error-overlay scroll sync — mirror has to track the input so the
    // squiggle stays aligned when the text scrolls horizontally (input) or
    // vertically (textarea).
    const mirrorRef = useRef<HTMLDivElement | null>(null);
    const syncScroll = () => {
      const el = inputRef.current;
      const mirror = mirrorRef.current;
      if (!el || !mirror) return;
      mirror.scrollLeft = el.scrollLeft;
      mirror.scrollTop = el.scrollTop;
    };

    const baseInputCls = cn(
      "w-full rounded-md border bg-background px-2 font-mono text-xs outline-none",
      multiline ? "min-h-0 py-1" : "h-8",
      error ? "border-warning/60 ring-1 ring-warning/30" : "border-border",
      className,
    );

    // Mirror gets identical box metrics so character positions line up. We
    // strip border/ring (they'd double the layout) and force background
    // transparent so the input shows through underneath. Text is
    // transparent — only the squiggle <span> paints.
    const mirrorCls = cn(
      "pointer-events-none absolute inset-0 overflow-hidden rounded-md px-2 font-mono text-xs text-transparent",
      multiline ? "py-1 whitespace-pre-wrap break-words" : "h-8 leading-8 whitespace-pre",
      "border border-transparent",
    );

    // Compute error-highlight slices once — split value into before/error/after.
    const errSlices = useMemo(() => {
      if (!error) return null;
      const start = Math.max(0, Math.min(error.pos, value.length));
      const end = Math.max(start + 1, Math.min(error.end ?? start + 1, value.length));
      return {
        before: value.slice(0, start),
        // Force at least one character so an EOL-error still renders a mark.
        mid: value.slice(start, end) || " ",
        after: value.slice(end),
      };
    }, [value, error]);

    return (
      <div className="relative">
        {/* Error-squiggle overlay — behind the input, transparent text +
            wavy underline on the error span. `text-decoration: underline
            wavy` is supported on all evergreen browsers. */}
        {errSlices && (
          <div ref={mirrorRef} aria-hidden className={mirrorCls}>
            {errSlices.before}
            <span style={{
              textDecoration: "underline wavy",
              textDecorationColor: "var(--warning, #f59e0b)",
              textDecorationThickness: "2px",
              textUnderlineOffset: "3px",
            }}>
              {errSlices.mid}
            </span>
            {errSlices.after}
          </div>
        )}
        {multiline ? (
          <textarea
            ref={(el) => { inputRef.current = el; }}
            value={value}
            onChange={(e) => { onChange(e.target.value); setCaret(e.target.selectionStart); }}
            onKeyDown={onKeyDown}
            onKeyUp={onSelOrChange}
            onClick={onSelOrChange}
            onFocus={onSelOrChange}
            onScroll={syncScroll}
            onBlur={() => { setTimeout(() => setOpen(false), 100); }}
            placeholder={placeholder}
            rows={3}
            className={cn(baseInputCls, "relative bg-transparent")}
            spellCheck={false}
          />
        ) : (
          <input
            ref={(el) => { inputRef.current = el; }}
            value={value}
            onChange={(e) => { onChange(e.target.value); setCaret(e.target.selectionStart ?? 0); }}
            onKeyDown={onKeyDown}
            onKeyUp={onSelOrChange}
            onClick={onSelOrChange}
            onFocus={onSelOrChange}
            onScroll={syncScroll}
            onBlur={() => { setTimeout(() => setOpen(false), 100); }}
            placeholder={placeholder}
            className={cn(baseInputCls, "relative bg-transparent")}
            spellCheck={false}
          />
        )}

        {sigHint && !(open && suggestions.length > 0) && (
          <div className="pointer-events-none absolute left-0 right-0 top-full z-40 mt-1 rounded-md border border-border bg-popover px-2 py-1 font-mono text-[10px] text-popover-foreground shadow-sm">
            <span className="text-foreground">{sigHint.name}(</span>
            {sigHint.sig.args.length === 0 ? (
              <span className="text-muted-foreground">no args</span>
            ) : (
              sigHint.sig.args.map((argName, i) => {
                // Variadic ("...x") collects every trailing arg under one slot,
                // so any current-arg ≥ the variadic index counts as active.
                const isVariadic = argName.startsWith("...");
                const isActive = isVariadic
                  ? sigHint.argIndex >= i
                  : i === sigHint.argIndex;
                return (
                  <span key={`${argName}-${i}`}>
                    <span className={cn(
                      isActive ? "font-bold text-foreground underline decoration-foreground/40 underline-offset-4" : "text-muted-foreground",
                    )}>
                      {argName}
                    </span>
                    {i < sigHint.sig.args.length - 1 && <span className="text-muted-foreground">, </span>}
                  </span>
                );
              })
            )}
            <span className="text-foreground">) → </span>
            <span className="text-muted-foreground">{sigHint.sig.returns}</span>
          </div>
        )}

        {open && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
          >
            {suggestions.slice(0, MAX_ROWS).map((sug, i) => (
              <li
                key={sug.label}
                role="option"
                aria-selected={i === activeIdx}
                // mousedown (not click) so the input's onBlur doesn't fire
                // first + collapse the dropdown before we get the event.
                onMouseDown={(e) => { e.preventDefault(); apply(sug); }}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 px-2 py-1 text-[11px]",
                  i === activeIdx && "bg-accent",
                )}
              >
                <span className="font-mono text-foreground">{sug.label}</span>
                {sug.detail && (
                  <span className="truncate text-muted-foreground">{sug.detail}</span>
                )}
              </li>
            ))}
            {suggestions.length > MAX_ROWS && (
              <li className="px-2 py-0.5 text-center text-[10px] text-muted-foreground">
                +{suggestions.length - MAX_ROWS} more — keep typing to narrow
              </li>
            )}
          </ul>
        )}

        {error && (
          <div className="mt-1 flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] text-warning">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {error.message}
              <span className="text-warning/70"> · pos {error.pos}</span>
            </span>
          </div>
        )}
      </div>
    );
  },
);

// Internal: ref-style sigil used in early dev for testability hooks.
// Suppress unused-import lint without exposing a public type.
void (null as unknown as MutableRefObject<HTMLInputElement>);
