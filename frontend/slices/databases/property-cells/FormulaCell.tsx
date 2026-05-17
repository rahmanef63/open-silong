import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Calculator } from "lucide-react";
import type { Database, Page, Property } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { evaluateFormulaWithError } from "../lib/formula";

interface Props {
  db: Database;
  prop: Property;
  row: Page;
  cellClass: string;
}

export function FormulaCell({ db, prop, row, cellClass }: Props) {
  const { pages, updateProperty } = useStore();
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={cn(cellClass, "w-full h-auto text-left px-2 py-1 rounded hover:bg-accent/50 flex items-center gap-1 font-normal justify-start [&_svg]:size-3.5")}>
          {cellResult.error ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
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
          <label className="block text-[11px] font-medium text-muted-foreground">Expression</label>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="{{title}}"
            className={cn(
              "h-8 w-full rounded-md border bg-background px-2 font-mono text-xs outline-none",
              liveResult.error ? "border-amber-500/60 ring-1 ring-amber-500/30" : "border-border",
            )}
          />
          {liveResult.error && (
            <Button
              type="button"
              variant="outline"
              onClick={jumpToErrorPos}
              className="flex w-full h-auto items-start gap-2 rounded-md border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-left text-[11px] font-normal text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 justify-start [&_svg]:size-3"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                {liveResult.error.message}
                <span className="text-amber-600/70"> · pos {liveResult.error.pos} (click to jump)</span>
              </span>
            </Button>
          )}
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground space-y-1">
            <div>Refs: <code className="rounded bg-background px-1">{"{{title}}"}</code> · <code className="rounded bg-background px-1">{"{{Property}}"}</code></div>
            <div>Math: <code className="rounded bg-background px-1">= {"{{Score}}"} * 2</code></div>
            <div>Logic: <code>if</code> · <code>and</code> · <code>or</code> · <code>not</code> · <code>empty</code></div>
            <div>String: <code>concat</code> · <code>contains</code> · <code>replace</code> · <code>lower</code> · <code>upper</code> · <code>length</code> · <code>substring</code></div>
            <div>Number: <code>round</code> · <code>floor</code> · <code>ceil</code> · <code>abs</code> · <code>min</code> · <code>max</code></div>
            <div>Date: <code>now</code> · <code>today</code> · <code>dateAdd(d, n, "day")</code> · <code>dateSubtract</code> · <code>dateBetween</code> · <code>formatDate(d, "DD/MM/YYYY")</code></div>
            <div>List: <code>count</code> · <code>sum</code> · <code>join(list, sep)</code></div>
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
