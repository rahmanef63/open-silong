import { ReactNode } from "react";
import { Database, DatabaseViewConfig, Property } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Switch } from "@/shared/ui/switch";
import { Checkbox } from "@/shared/ui/checkbox";
import { Button } from "@/shared/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface ViewOptionsProps {
  db: Database;
  view: DatabaseViewConfig;
}

export function useUpdate(db: Database, view: DatabaseViewConfig) {
  const { updateView } = useStore();
  return (patch: Partial<DatabaseViewConfig>) => updateView(db.id, view.id, patch);
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 border-t border-border pt-2 first:border-0 first:pt-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</div>
      {children}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-xs w-full">
      {options.map(o => (
        <Button
          variant="ghost"
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-auto flex-1 rounded px-2 py-1 text-xs font-normal transition",
            value === o.value ? "bg-brand text-white font-medium hover:bg-brand hover:text-white" : "text-muted-foreground hover:bg-accent"
          )}
        >{o.label}</Button>
      ))}
    </div>
  );
}

export function PropPicker({ value, onPick, props, allowEmpty, emptyLabel }: {
  value: string | undefined;
  onPick: (id: string | undefined) => void;
  props: Property[];
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const current = props.find(p => p.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-auto w-full justify-between rounded-md bg-card px-2 py-1 text-xs font-normal [&_svg]:size-3">
          <span className="truncate">{current?.name ?? emptyLabel ?? "—"}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto">
        {allowEmpty && (
          <DropdownMenuItem onClick={() => onPick(undefined)}>
            <span className="text-muted-foreground">{emptyLabel ?? "None"}</span>
          </DropdownMenuItem>
        )}
        {props.length === 0 ? (
          <DropdownMenuItem disabled>No matching properties</DropdownMenuItem>
        ) : props.map(p => (
          <DropdownMenuItem key={p.id} onClick={() => onPick(p.id)}>
            {p.name} <span className="ml-auto text-[10px] text-muted-foreground">{p.type}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MultiPropChecklist({ db, value, onChange, filter, max }: {
  db: Database; value: string[] | undefined;
  onChange: (ids: string[]) => void;
  filter?: (p: Property) => boolean;
  max?: number;
}) {
  const ids = value ?? [];
  const list = filter ? db.properties.filter(filter) : db.properties;
  const toggle = (pid: string) => {
    if (ids.includes(pid)) onChange(ids.filter(x => x !== pid));
    else if (max && ids.length >= max) return;
    else onChange([...ids, pid]);
  };
  return (
    <div className="rounded-md border border-border max-h-40 overflow-y-auto divide-y divide-border">
      {list.length === 0 && <div className="px-2 py-2 text-[10px] text-muted-foreground">No matching properties</div>}
      {list.map(p => (
        <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent/50 cursor-pointer">
          <Checkbox checked={ids.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
          <span className="flex-1 truncate">{p.name}</span>
          <span className="text-[10px] text-muted-foreground">{p.type}</span>
        </label>
      ))}
      {max != null && (
        <div className="px-2 py-1 text-[10px] text-muted-foreground">{ids.length}/{max} selected</div>
      )}
    </div>
  );
}

export const isCategorical = (p: Property) => p.type === "select" || p.type === "status";
export const isNumeric = (p: Property) => p.type === "number";
export const isDate = (p: Property) => p.type === "date";
