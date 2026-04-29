import { useState } from "react";
import { Property, PropertyValue, Page, Database } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { colorClass, formatRelTime } from "@/lib/format";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";

export function PropertyCell({
  db, prop, row, compact = false,
}: {
  db: Database; prop: Property; row: Page; compact?: boolean;
}) {
  const { setRowValue, addSelectOption, user } = useStore();
  const value = row.rowProps?.[prop.id];

  const set = (v: PropertyValue) => setRowValue(db.id, row.id, prop.id, v);

  const cellClass = compact
    ? "min-h-6 text-xs"
    : "min-h-8 text-sm";

  switch (prop.type) {
    case "text":
      return (
        <input
          value={(value as string) ?? ""}
          onChange={e => set(e.target.value)}
          placeholder="—"
          className={cn(cellClass, "w-full bg-transparent outline-none px-2 py-1 rounded hover:bg-accent/50 focus:bg-accent/50")}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={(value as number) ?? ""}
          onChange={e => set(e.target.value === "" ? null : Number(e.target.value))}
          placeholder="—"
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
          placeholder="—"
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
          value={((value as any)?.date) ?? ""}
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
              {opt ? <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(opt.color))}>{opt.name}</span>
                : <span className="text-muted-foreground">—</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1">
            <div className="space-y-0.5 max-h-60 overflow-y-auto">
              {prop.options?.map(o => (
                <button key={o.id} onClick={() => set(o.id)} className="flex w-full items-center px-2 py-1 rounded hover:bg-accent text-sm">
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(o.color))}>{o.name}</span>
                </button>
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
              {selected.length === 0 && <span className="text-muted-foreground">—</span>}
              {selected.map(o => (
                <span key={o.id} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(o.color))}>{o.name}</span>
              ))}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-1">
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {prop.options?.map(o => {
                const on = ids.includes(o.id);
                return (
                  <button
                    key={o.id}
                    onClick={() => set(on ? ids.filter(x => x !== o.id) : [...ids, o.id])}
                    className={cn("flex w-full items-center justify-between px-2 py-1 rounded text-sm", on ? "bg-accent" : "hover:bg-accent")}
                  >
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(o.color))}>{o.name}</span>
                    {on && <X className="h-3 w-3 text-muted-foreground" />}
                  </button>
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
      return <span className="px-2 py-1 text-xs text-muted-foreground italic">Files (placeholder)</span>;
    case "relation":
      return <span className="px-2 py-1 text-xs text-muted-foreground italic">Relation (placeholder)</span>;
    case "rollup":
      return <span className="px-2 py-1 text-xs text-muted-foreground italic">Rollup (placeholder)</span>;
    case "formula":
      return <span className="px-2 py-1 text-xs text-muted-foreground italic">Formula (placeholder)</span>;
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
  }
}

function AddOption({ db, propId }: { db: Database; propId: string }) {
  const { addSelectOption } = useStore();
  const [name, setName] = useState("");
  return (
    <div className="border-t border-border mt-1 pt-1 px-1">
      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) { addSelectOption(db.id, propId, name.trim()); setName(""); } }}
        className="flex items-center gap-1"
      >
        <input
          value={name} onChange={e => setName(e.target.value)} placeholder="New option…"
          className="flex-1 bg-transparent text-xs outline-none px-2 py-1 rounded hover:bg-accent"
        />
        <button type="submit" className="rounded p-1 hover:bg-accent text-muted-foreground"><Plus className="h-3 w-3" /></button>
      </form>
    </div>
  );
}
