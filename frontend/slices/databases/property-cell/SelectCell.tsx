import type { Database, Property, PropertyValue } from "@/shared/types/domain";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { colorClass } from "@/shared/lib/format";
import { X } from "lucide-react";
import { OptionRow, AddOption } from "../property-cells/SelectOptionRow";

export function SelectCell({
  db, prop, value, onSet, cellClass,
}: {
  db: Database;
  prop: Property;
  value: PropertyValue;
  onSet: (v: PropertyValue) => void;
  cellClass: string;
}) {
  const selectedId = value as string | null;
  const opt = prop.options?.find((o) => o.id === selectedId);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={cn(cellClass, "h-auto w-full justify-start rounded px-2 py-1 text-left font-normal hover:bg-accent/50")}>
          {opt
            ? <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(opt.color))}>{opt.name}</span>
            : <span className="text-muted-foreground">-</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1">
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {prop.options?.map((o) => (
            <OptionRow
              key={o.id}
              db={db}
              propId={prop.id}
              option={o}
              selected={o.id === selectedId}
              onSelect={() => onSet(o.id === selectedId ? null : o.id)}
            />
          ))}
          <Button variant="ghost" onClick={() => onSet(null)} className="h-auto w-full justify-start rounded px-2 py-1 text-xs font-normal text-muted-foreground [&_svg]:size-3">
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        </div>
        <AddOption db={db} propId={prop.id} />
      </PopoverContent>
    </Popover>
  );
}

export function MultiSelectCell({
  db, prop, value, onSet, cellClass,
}: {
  db: Database;
  prop: Property;
  value: PropertyValue;
  onSet: (v: PropertyValue) => void;
  cellClass: string;
}) {
  const ids = (value as string[]) ?? [];
  const selected = prop.options?.filter((o) => ids.includes(o.id)) ?? [];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={cn(cellClass, "h-auto w-full flex-wrap justify-start gap-1 rounded px-2 py-1 text-left font-normal hover:bg-accent/50")}>
          {selected.length === 0 && <span className="text-muted-foreground">-</span>}
          {selected.map((o) => (
            <span key={o.id} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(o.color))}>{o.name}</span>
          ))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1">
        <div className="max-h-60 overflow-y-auto space-y-0.5">
          {prop.options?.map((o) => {
            const on = ids.includes(o.id);
            return (
              <OptionRow
                key={o.id}
                db={db}
                propId={prop.id}
                option={o}
                selected={on}
                onSelect={() => onSet(on ? ids.filter((x) => x !== o.id) : [...ids, o.id])}
              />
            );
          })}
        </div>
        <AddOption db={db} propId={prop.id} />
      </PopoverContent>
    </Popover>
  );
}
