import { Database, Page, Property, PropertyValue } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/shared/lib/utils";
import { colorClass, formatRelTime } from "@/shared/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Checkbox } from "@/shared/ui/checkbox";
import { X } from "lucide-react";
import { RelationCell } from "./property-cells/RelationCell";
import { FilesCell } from "./property-cells/FilesCell";
import { RollupCell } from "./property-cells/RollupCell";
import { FormulaCell } from "./property-cells/FormulaCell";
import { OptionRow, AddOption } from "./property-cells/SelectOptionRow";

interface Props {
  db: Database;
  prop: Property;
  row: Page;
  /** Compact density renders smaller text + smaller min-height. */
  compact?: boolean;
}

export function PropertyCell({ db, prop, row, compact = false }: Props) {
  const { setRowValue, user } = useStore();
  const value = row.rowProps?.[prop.id];

  const set = (v: PropertyValue) => setRowValue(db.id, row.id, prop.id, v);
  const cellClass = compact ? "min-h-6 text-xs" : "min-h-8 text-sm";

  switch (prop.type) {
    case "text":
      return (
        <input
          value={(value as string) ?? ""}
          onChange={e => set(e.target.value)}
          placeholder="-"
          className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50 focus:bg-accent/50")}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={(value as number) ?? ""}
          onChange={e => set(e.target.value === "" ? null : Number(e.target.value))}
          placeholder="-"
          className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50 tabular-nums")}
        />
      );
    case "url":
    case "email":
    case "phone":
      return (
        <input
          value={(value as string) ?? ""}
          onChange={e => set(e.target.value)}
          placeholder="-"
          className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50 text-brand")}
        />
      );
    case "checkbox":
      return (
        <div className="px-2 py-1">
          <Checkbox checked={!!value} onCheckedChange={(v) => set(!!v)} />
        </div>
      );
    case "date":
      return (
        <input
          type="date"
          value={typeof value === "object" && value && "date" in value ? value.date ?? "" : ""}
          onChange={e => set({ date: e.target.value })}
          className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50")}
        />
      );
    case "select":
    case "status": {
      const selectedId = value as string | null;
      const opt = prop.options?.find(o => o.id === selectedId);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50")}>
              {opt
                ? <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(opt.color))}>{opt.name}</span>
                : <span className="text-muted-foreground">-</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1">
            <div className="space-y-0.5 max-h-60 overflow-y-auto">
              {prop.options?.map(o => (
                <OptionRow
                  key={o.id}
                  db={db}
                  propId={prop.id}
                  option={o}
                  selected={o.id === selectedId}
                  onSelect={() => set(o.id === selectedId ? null : o.id)}
                />
              ))}
              <button onClick={() => set(null)} className="flex w-full items-center px-2 py-1 rounded hover:bg-accent text-xs text-muted-foreground">
                <X className="mr-1 h-3 w-3" /> Clear
              </button>
            </div>
            <AddOption db={db} propId={prop.id} />
          </PopoverContent>
        </Popover>
      );
    }
    case "multi_select": {
      const ids = (value as string[]) ?? [];
      const selected = prop.options?.filter(o => ids.includes(o.id)) ?? [];
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50 flex flex-wrap gap-1")}>
              {selected.length === 0 && <span className="text-muted-foreground">-</span>}
              {selected.map(o => (
                <span key={o.id} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(o.color))}>{o.name}</span>
              ))}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1">
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {prop.options?.map(o => {
                const on = ids.includes(o.id);
                return (
                  <OptionRow
                    key={o.id}
                    db={db}
                    propId={prop.id}
                    option={o}
                    selected={on}
                    onSelect={() => set(on ? ids.filter(x => x !== o.id) : [...ids, o.id])}
                  />
                );
              })}
            </div>
            <AddOption db={db} propId={prop.id} />
          </PopoverContent>
        </Popover>
      );
    }
    case "person":
      return (
        <button onClick={() => set([user.id])} className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50")}>
          {(value as string[])?.includes(user.id) ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20">{user.icon}</span>
              {user.name}
            </span>
          ) : <span className="text-muted-foreground text-xs">Click to assign me</span>}
        </button>
      );
    case "files":
      return <FilesCell db={db} prop={prop} row={row} value={value} onSet={set} cellClass={cellClass} />;
    case "relation":
      return <RelationCell db={db} prop={prop} row={row} value={value} onSet={set} cellClass={cellClass} />;
    case "rollup":
      return <RollupCell db={db} prop={prop} row={row} cellClass={cellClass} />;
    case "formula":
      return <FormulaCell db={db} prop={prop} row={row} cellClass={cellClass} />;
    case "created_time":
      return <span className="px-2 py-1 text-xs text-muted-foreground">{formatRelTime(row.createdAt)}</span>;
    case "last_edited_time":
      return <span className="px-2 py-1 text-xs text-muted-foreground">{formatRelTime(row.updatedAt)}</span>;
    case "created_by":
    case "last_edited_by":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20">{user.icon}</span>
          {user.name}
        </span>
      );
    case "unique_id":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono tracking-tight text-muted-foreground">
          {typeof value === "string" || typeof value === "number" ? String(value) : "—"}
        </span>
      );
  }
}
