import type { Database, Property } from "@/shared/types/domain";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "./atoms";

export function FormulaConfig({ db, prop, updateProperty }: {
  db: Database;
  prop: Property;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}) {
  return (
    <div>
      <Label>Expression</Label>
      <Textarea
        value={prop.formulaExpression ?? ""}
        onChange={(e) => updateProperty(db.id, prop.id, { formulaExpression: e.target.value })}
        placeholder='{{title}} or =round({{Price}} * 1.1, 2)'
        rows={3}
        className="mt-1 min-h-0 px-2 py-1 font-mono text-xs"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        18 fns available: if/and/or/not/empty/concat/contains/replace/lower/upper/length/round/floor/ceil/abs/min/max/now/today.
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
