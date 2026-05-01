import { useState } from "react";
import { Calculator } from "lucide-react";
import type { Database, Page, Property } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/shared/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import { evaluateFormula } from "../lib/formula";

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
  const value = evaluateFormula(expression, row, db, pages);

  const save = () => {
    updateProperty(db.id, prop.id, { formulaExpression: draft.trim() || "{{title}}" });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50 flex items-center gap-1")}>
          <Calculator className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="min-w-0 truncate">{value || "-"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <form
          onSubmit={(e) => { e.preventDefault(); save(); }}
          className="space-y-2"
        >
          <label className="block text-[11px] font-medium text-muted-foreground">Expression</label>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="{{title}}"
            className="h-8 w-full rounded-md border border-border bg-background px-2 font-mono text-xs outline-none"
          />
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground space-y-1">
            <div>Use <code className="bg-background px-1 rounded">{"{{title}}"}</code> or <code className="bg-background px-1 rounded">{"{{Property}}"}</code>.</div>
            <div>Math: <code className="bg-background px-1 rounded">= 1 + 2</code></div>
            <div>Functions: <code className="bg-background px-1 rounded">if(...)</code> · <code className="bg-background px-1 rounded">concat()</code> · <code className="bg-background px-1 rounded">lower()</code> · <code className="bg-background px-1 rounded">upper()</code> · <code className="bg-background px-1 rounded">length()</code> · <code className="bg-background px-1 rounded">contains()</code> · <code className="bg-background px-1 rounded">round()</code> · <code className="bg-background px-1 rounded">abs()</code> · <code className="bg-background px-1 rounded">today()</code></div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs text-muted-foreground">Preview: {value || "-"}</span>
            <button type="submit" className="rounded-md bg-foreground px-2 py-1 text-xs text-background">
              Save
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
