import { Database, DatabaseFilter, DatabaseViewConfig, Property } from "@/shared/types/domain";
import { Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";

const OPS: { value: DatabaseFilter["op"]; label: string; needsValue: boolean }[] = [
  { value: "contains", label: "contains", needsValue: true },
  { value: "equals", label: "equals", needsValue: true },
  { value: "not_empty", label: "is not empty", needsValue: false },
  { value: "is_empty", label: "is empty", needsValue: false },
  { value: "checked", label: "is checked", needsValue: false },
  { value: "unchecked", label: "is unchecked", needsValue: false },
];

interface Props {
  db: Database;
  view: DatabaseViewConfig;
  writeView: (viewId: string, patch: Partial<DatabaseViewConfig>) => void;
}

export function FilterBuilder({ db, view, writeView }: Props) {
  const filters = view.filters ?? [];

  const setFilters = (next: DatabaseFilter[]) => writeView(view.id, { filters: next });

  const addFilter = () => {
    const prop = db.properties[0];
    if (!prop) return;
    setFilters([...filters, { propertyId: prop.id, op: "contains", value: "" }]);
  };

  const remove = (i: number) => setFilters(filters.filter((_, j) => j !== i));

  const update = (i: number, patch: Partial<DatabaseFilter>) =>
    setFilters(filters.map((f, j) => j === i ? { ...f, ...patch } : f));

  return (
    <div className="p-2 space-y-2 min-w-[320px]">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Filters</div>
      {filters.length === 0 && (
        <div className="text-xs text-muted-foreground px-1">No filters applied.</div>
      )}
      {filters.map((f, i) => {
        const prop = db.properties.find(p => p.id === f.propertyId);
        const opMeta = OPS.find(o => o.value === f.op);
        return (
          <div key={i} className="flex items-center gap-1.5 flex-wrap">
            <Select value={f.propertyId} onValueChange={v => update(i, { propertyId: v })}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                {db.properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={f.op} onValueChange={v => update(i, { op: v as DatabaseFilter["op"] })}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {opMeta?.needsValue && (
              <Input
                value={f.value ?? ""}
                onChange={e => update(i, { value: e.target.value })}
                className="h-7 text-xs w-28"
                placeholder="value"
              />
            )}

            <button onClick={() => remove(i)} className="rounded p-1 hover:bg-accent text-muted-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      <button
        onClick={addFilter}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
      >
        <Plus className="h-3 w-3" /> Add filter
      </button>
    </div>
  );
}
