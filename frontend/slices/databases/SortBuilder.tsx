import { Database, DatabaseSort, DatabaseViewConfig } from "@/shared/types/domain";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";

interface Props {
  db: Database;
  view: DatabaseViewConfig;
  writeView: (viewId: string, patch: Partial<DatabaseViewConfig>) => void;
}

export function SortBuilder({ db, view, writeView }: Props) {
  const sorts = view.sorts ?? [];

  const setSorts = (next: DatabaseSort[]) => writeView(view.id, { sorts: next });

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

          <Button
            variant="outline"
            onClick={() => toggle(i)}
            className="h-auto gap-1 rounded px-2 py-1 text-xs font-normal [&_svg]:size-3"
          >
            {s.direction === "asc"
              ? <><ArrowUp className="h-3 w-3" /> Asc</>
              : <><ArrowDown className="h-3 w-3" /> Desc</>}
          </Button>

          <Button variant="ghost" onClick={() => remove(i)} className="h-auto rounded p-1 text-muted-foreground [&_svg]:size-3">
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        onClick={addSort}
        className="mt-1 h-auto gap-1 p-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:size-3"
      >
        <Plus className="h-3 w-3" /> Add sort
      </Button>
    </div>
  );
}
