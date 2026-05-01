import { Database, DatabaseSort, DatabaseViewConfig } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export function SortBuilder({ db, view }: { db: Database; view: DatabaseViewConfig }) {
  const { updateView } = useStore();
  const sorts = view.sorts ?? [];

  const setSorts = (next: DatabaseSort[]) => updateView(db.id, view.id, { sorts: next });

  const addSort = () => {
    const prop = db.properties.find(p => !sorts.some(s => s.propertyId === p.id));
    if (!prop) return;
    setSorts([...sorts, { propertyId: prop.id, direction: "asc" }]);
  };

  const remove = (i: number) => setSorts(sorts.filter((_, j) => j !== i));

  const toggle = (i: number) =>
    setSorts(sorts.map((s, j) => j === i ? { ...s, direction: s.direction === "asc" ? "desc" : "asc" } : s));

  const setProp = (i: number, propId: string) =>
    setSorts(sorts.map((s, j) => j === i ? { ...s, propertyId: propId } : s));

  return (
    <div className="p-2 space-y-2 min-w-[260px]">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Sort</div>
      {sorts.length === 0 && (
        <div className="text-xs text-muted-foreground px-1">No sorts applied.</div>
      )}
      {sorts.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Select value={s.propertyId} onValueChange={v => setProp(i, v)}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Property" />
            </SelectTrigger>
            <SelectContent>
              {db.properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <button
            onClick={() => toggle(i)}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-accent"
          >
            {s.direction === "asc"
              ? <><ArrowUp className="h-3 w-3" /> Asc</>
              : <><ArrowDown className="h-3 w-3" /> Desc</>}
          </button>

          <button onClick={() => remove(i)} className="rounded p-1 hover:bg-accent text-muted-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        onClick={addSort}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
      >
        <Plus className="h-3 w-3" /> Add sort
      </button>
    </div>
  );
}
