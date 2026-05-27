import { useRef } from "react";
import type { Database, Property } from "@/shared/types/domain";
import { Input } from "@/shared/ui/input";
import { Label } from "./atoms";
import { FunctionPicker } from "../../property-cells/formula-cell/FunctionPicker";
import { FormulaExpressionEditor, type FormulaExpressionEditorRef } from "../../property-cells/formula-cell/FormulaExpressionEditor";

export function FormulaConfig({ db, prop, updateProperty }: {
  db: Database;
  prop: Property;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}) {
  const editorRef = useRef<FormulaExpressionEditorRef | null>(null);
  const value = prop.formulaExpression ?? "";

  const insertFunction = (name: string) => {
    const isProp = name === "prop";
    const tail = isProp ? `${name}("")` : `${name}()`;
    const caretOffset = isProp ? -2 : -1; // inside the quotes vs between parens
    if (value.trim() === "") {
      updateProperty(db.id, prop.id, { formulaExpression: `=${tail}` });
      queueMicrotask(() => editorRef.current?.setCaret(1 + tail.length + caretOffset));
      return;
    }
    editorRef.current?.insertAtCaret(tail, caretOffset);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label>Expression</Label>
        <FunctionPicker onPick={insertFunction} />
      </div>
      <FormulaExpressionEditor
        ref={editorRef}
        value={value}
        onChange={(next) => updateProperty(db.id, prop.id, { formulaExpression: next })}
        db={db}
        multiline
        placeholder='{{title}} or =round({{Price}} * 1.1, 2)'
        className="mt-1"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Type to autocomplete · <code>fx ▾</code> picker shows all ~50 functions grouped.
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
