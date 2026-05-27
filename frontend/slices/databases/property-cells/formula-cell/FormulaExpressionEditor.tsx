"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent, type MutableRefObject } from "react";
import { AlertTriangle } from "lucide-react";
import type { Database } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import {
  SIGNATURES, listFunctionNames,
} from "../../lib/formulaEngine/functions";
import type { FormulaError } from "../../lib/formulaEngine/types";
import { getTokenAt, propNeedsClose, type Token } from "./tokenize";

/** Suggestion presented in the dropdown. `insert` is the literal text
 *  that replaces `[token.start .. caret]`. Optional `caretOffset`
 *  positions the caret inside the insert (e.g. between fn parens). */
interface Suggestion {
  label: string;
  insert: string;
  /** Cursor position relative to `start + insert.length` after insert.
   *  Defaults to 0 (end of insert). */
  caretOffset?: number;
  /** Secondary line — fn signature, prop type, etc. */
  detail?: string;
}

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

    const baseInputCls = cn(
      "w-full rounded-md border bg-background px-2 font-mono text-xs outline-none",
      multiline ? "min-h-0 py-1" : "h-8",
      error ? "border-warning/60 ring-1 ring-warning/30" : "border-border",
      className,
    );

    return (
      <div className="relative">
        {multiline ? (
          <textarea
            ref={(el) => { inputRef.current = el; }}
            value={value}
            onChange={(e) => { onChange(e.target.value); setCaret(e.target.selectionStart); }}
            onKeyDown={onKeyDown}
            onKeyUp={onSelOrChange}
            onClick={onSelOrChange}
            onFocus={onSelOrChange}
            onBlur={() => { setTimeout(() => setOpen(false), 100); }}
            placeholder={placeholder}
            rows={3}
            className={baseInputCls}
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
            onBlur={() => { setTimeout(() => setOpen(false), 100); }}
            placeholder={placeholder}
            className={baseInputCls}
            spellCheck={false}
          />
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

/** Build the suggestion list for the current token. Pure — split out for
 *  testability + memo stability. */
function buildSuggestions(token: Token, value: string, caret: number, db: Database): Suggestion[] {
  if (token.kind === "prop") {
    const lc = token.prefix.toLowerCase();
    const includeClose = propNeedsClose(value, caret);
    const out: Suggestion[] = [];
    // Built-in `title` ref — always available.
    if ("title".startsWith(lc)) {
      out.push({ label: "title", insert: `title${includeClose ? "}}" : ""}`, detail: "row title" });
    }
    for (const p of db.properties) {
      if (!p.name.toLowerCase().startsWith(lc)) continue;
      out.push({
        label: p.name,
        insert: `${p.name}${includeClose ? "}}" : ""}`,
        detail: p.type,
      });
    }
    return out;
  }

  if (token.kind === "fn") {
    const lc = token.prefix.toLowerCase();
    const names = listFunctionNames();
    const matches = names.filter((n) => n.toLowerCase().startsWith(lc));
    return matches.map((name) => {
      const sig = SIGNATURES[name];
      // Insert `fnName()` with caret BETWEEN the parens (offset -1 from end).
      return {
        label: name,
        insert: `${name}()`,
        caretOffset: -1,
        detail: sig ? `(${sig.args.join(", ")}) → ${sig.returns}` : undefined,
      };
    });
  }

  return [];
}

// Internal: ref-style sigil used in early dev for testability hooks.
// Suppress unused-import lint without exposing a public type.
void (null as unknown as MutableRefObject<HTMLInputElement>);
