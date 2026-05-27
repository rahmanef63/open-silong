import { useRef } from "react";
import type { Database, Property } from "@/shared/types/domain";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "./atoms";
import { FunctionPicker } from "../../property-cells/formula-cell/FunctionPicker";

export function FormulaConfig({ db, prop, updateProperty }: {
  db: Database;
  prop: Property;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const value = prop.formulaExpression ?? "";

  const insertFunction = (name: string) => {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const needsMathPrefix = value.trim() === "" && start === 0;
    const insert = `${needsMathPrefix ? "=" : ""}${name}()`;
    const next = value.slice(0, start) + insert + value.slice(end);
    updateProperty(db.id, prop.id, { formulaExpression: next });
    queueMicrotask(() => {
      ta?.focus();
      const caret = start + insert.length - 1;
      ta?.setSelectionRange(caret, caret);
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label>Expression</Label>
        <FunctionPicker onPick={insertFunction} />
      </div>
      <Textarea
        ref={taRef}
        value={value}
        onChange={(e) => updateProperty(db.id, prop.id, { formulaExpression: e.target.value })}
        placeholder='{{title}} or =round({{Price}} * 1.1, 2)'
        rows={3}
        className="mt-1 min-h-0 px-2 py-1 font-mono text-xs"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        ~50 functions across string/number/date/list/logic — open the <code>fx ▾</code> picker to browse.
      </p>
    </div>
  );
}

export function UniqueIdConfig({ db, prop, updateProperty }: {
  db: Database;
  prop: Property;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}) {
  return (
    <div>
      <Label>Prefix (optional)</Label>
      <Input
        value={prop.uniqueIdPrefix ?? ""}
        onChange={(e) => updateProperty(db.id, prop.id, { uniqueIdPrefix: e.target.value || undefined })}
        placeholder="TASK"
        className="mt-1 h-8 text-sm"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Existing rows keep their old IDs. New rows: {prop.uniqueIdPrefix ? `${prop.uniqueIdPrefix}-N` : "N"}.
      </p>
    </div>
  );
}

export function PlaceConfig() {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
      Place property stores a free-form location string. Map view integration is planned.
    </div>
  );
}

export function SelectConfig({ prop }: { prop: Property }) {
  const count = prop.options?.length ?? 0;
  return (
    <div className="rounded-md border border-border px-2 py-1.5 text-[11px] text-muted-foreground">
      {count} option{count === 1 ? "" : "s"}. Edit options inline in any cell.
    </div>
  );
}
