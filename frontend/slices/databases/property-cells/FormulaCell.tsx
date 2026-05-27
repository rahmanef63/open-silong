import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Calculator } from "lucide-react";
import type { Database, Page, Property } from "@/shared/types/domain";
import { useDbAdapter } from "../lib/useDbAdapter";
import { cn } from "@/shared/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { evaluateFormulaWithError } from "../lib/formula";
import { FunctionPicker } from "./formula-cell/FunctionPicker";

interface Props {
  db: Database;
  prop: Property;
  row: Page;
  cellClass: string;
}

export function FormulaCell({ db, prop, row, cellClass }: Props) {
  const { pages, updateProperty } = useDbAdapter();
  const expression = prop.formulaExpression ?? "{{title}}";
  const [draft, setDraft] = useState(expression);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Live re-eval of the draft so users see errors as they type.
  const liveResult = useMemo(
    () => evaluateFormulaWithError(draft, row, db, pages),
    [draft, row, db, pages],
  );
  // Saved expression is what the cell displays.
  const cellResult = useMemo(
    () => evaluateFormulaWithError(expression, row, db, pages),
    [expression, row, db, pages],
  );

  const save = () => {
    updateProperty(db.id, prop.id, { formulaExpression: draft.trim() || "{{title}}" });
  };

  const jumpToErrorPos = () => {
    if (!liveResult.error || !inputRef.current) return;
    inputRef.current.focus();
    inputRef.current.setSelectionRange(liveResult.error.pos, liveResult.error.pos + 1);
  };

  /** Insert `fnName()` at caret, then position caret BETWEEN the parens so
   *  the user can start typing args immediately. Restores focus. */
  const insertFunction = (name: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    // If draft is empty AND fn returns a non-string, prepend `=` so it parses
    // as expression mode. Otherwise insert raw — user can wrap in `=` if needed.
    const needsMathPrefix = draft.trim() === "" && start === 0;
    const insert = `${needsMathPrefix ? "=" : ""}${name}()`;
    const next = draft.slice(0, start) + insert + draft.slice(end);
    setDraft(next);
    queueMicrotask(() => {
      input?.focus();
      const caret = start + insert.length - 1; // between the parens
      input?.setSelectionRange(caret, caret);
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={cn(cellClass, "h-auto w-full justify-start gap-1 rounded px-2 py-1 text-left font-normal hover:bg-accent/50 [&_svg]:size-3.5")}>
          {cellResult.error ? (
            <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
          ) : (
            <Calculator className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="min-w-0 truncate">{cellResult.error ? "Invalid formula" : (cellResult.display || "-")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <form
          onSubmit={(e) => { e.preventDefault(); save(); }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <label className="block text-[11px] font-medium text-muted-foreground">Expression</label>
            <FunctionPicker onPick={insertFunction} />
          </div>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="{{title}}"
            className={cn(
              "h-8 w-full rounded-md border bg-background px-2 font-mono text-xs outline-none",
              liveResult.error ? "border-warning/60 ring-1 ring-warning/30" : "border-border",
            )}
          />
          {liveResult.error && (
            <Button
              variant="ghost"
              type="button"
              onClick={jumpToErrorPos}
              className="h-auto w-full items-start justify-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-2 py-1.5 text-left text-[11px] font-normal text-warning hover:bg-warning/20 [&_svg]:size-3"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                {liveResult.error.message}
                <span className="text-warning/70"> · pos {liveResult.error.pos} (click to jump)</span>
              </span>
            </Button>
          )}
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground space-y-1">
            <div>Refs: <code className="rounded bg-background px-1">{"{{title}}"}</code> · <code className="rounded bg-background px-1">{"{{Property}}"}</code></div>
            <div>Math: <code className="rounded bg-background px-1">= {"{{Score}}"} * 2</code></div>
            <div>Compare: <code>==</code> <code>!=</code> <code>&lt;</code> <code>&gt;=</code> · Logic: <code>&amp;&amp;</code> <code>||</code> <code>!</code></div>
            <div>Tip: hit the <code>fx ▾</code> button to browse all ~50 functions by group.</div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              Preview: {liveResult.error ? "—" : (liveResult.display || "-")}
            </span>
            <Button
              type="submit"
              disabled={!!liveResult.error}
              className="h-auto rounded-md bg-foreground px-2 py-1 text-xs text-background hover:bg-foreground/90"
            >
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
