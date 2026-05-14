import { useStore } from "@/shared/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/shared/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Settings2, Plus, Copy, Lock, Unlock, Network } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { DynamicIcon, IconPickerPopover, DEFAULT_DATABASE_ICON } from "@/shared/components/icon-picker";
import { ViewOptions } from "../ViewOptions";
import { DataMenu } from "@/slices/database-json";
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPES } from "../lib/propertyTypeMeta";
import type { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";

export function DatabaseMenu({ db, view, rows }: { db: Database; view: DatabaseViewConfig; rows: Page[] }) {
  const { updateDatabase, trashDatabase, duplicateDatabase } = useStore();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="rounded p-1 hover:bg-accent text-muted-foreground"
          title="Database menu"
          aria-label="Database menu"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Database</div>
        <button
          onClick={() => {
            const next = window.prompt("Database name", db.name);
            if (next != null && next.trim()) updateDatabase(db.id, { name: next.trim() });
          }}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
        >
          <Pencil className="h-3.5 w-3.5" /> Rename
        </button>
        <IconPickerPopover
          value={db.icon}
          onChange={(next) => updateDatabase(db.id, { icon: next })}
          onClear={() => updateDatabase(db.id, { icon: DEFAULT_DATABASE_ICON })}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
          >
            <DynamicIcon value={db.icon} className="text-base h-3.5 w-3.5" fallback={DEFAULT_DATABASE_ICON} />
            Change icon
          </button>
        </IconPickerPopover>
        <button
          onClick={() => duplicateDatabase(db.id)}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
          title="Clone structure (properties + views) — rows are NOT copied"
        >
          <Copy className="h-3.5 w-3.5" /> Duplicate (structure only)
        </button>
        <button
          onClick={() => duplicateDatabase(db.id, { includeRows: true })}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
          title="Clone structure + deep-copy rows (capped at 5000)"
        >
          <Copy className="h-3.5 w-3.5" /> Duplicate with rows
        </button>
        <button
          onClick={() => updateDatabase(db.id, { locked: !db.locked })}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
          title={db.locked ? "Unlock — allow property/view edits" : "Lock — prevent property/view edits"}
        >
          {db.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {db.locked ? "Unlock database" : "Lock database"}
        </button>
        <SubItemsPicker db={db} />
        <button
          onClick={() => {
            if (window.confirm(`Move "${db.name}" to Trash? Rows are kept and can be restored.`)) {
              trashDatabase(db.id);
            }
          }}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-destructive/10 text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete database
        </button>
        <div className="my-1 border-t border-border" />
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">This view</div>
        <div className="px-1 flex flex-col gap-0.5">
          <ViewOptions db={db} view={view} />
          <PropertiesMenu db={db} view={view} />
        </div>
        <div className="my-1 border-t border-border" />
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Data</div>
        <div className="px-1 flex flex-col gap-0.5">
          <DataMenu db={db} rows={rows} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SubItemsPicker({ db }: { db: Database }) {
  const { updateDatabase } = useStore();
  // A property is eligible as the sub-items parent if it's a self-relation
  // (or a generic relation that the user has set to point at this db).
  // The "all rows" legacy variant (no relationDatabaseId) is treated as
  // pointing to all dbs and is eligible too.
  const eligible = db.properties.filter(
    (p) => p.type === "relation" &&
      (p.relationDatabaseId === db.id || p.relationDatabaseId == null),
  );
  const current = db.subItemsParentPropId
    ? eligible.find((p) => p.id === db.subItemsParentPropId) ?? null
    : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
          title="Designate a self-relation property to display rows as a tree (sub-items)"
        >
          <Network className="h-3.5 w-3.5" />
          Sub-items: <span className="text-muted-foreground truncate">{current?.name ?? "off"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs">Use as parent → sub-items relation</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => updateDatabase(db.id, { subItemsParentPropId: null })}>
          <span className={cn(!current && "text-brand")}>Off</span>
        </DropdownMenuItem>
        {eligible.length === 0 ? (
          <div className="px-2 py-2 text-[11px] text-muted-foreground italic">
            Add a relation property pointing at this database to enable sub-items.
          </div>
        ) : (
          eligible.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => updateDatabase(db.id, { subItemsParentPropId: p.id })}
            >
              <span className={cn(current?.id === p.id && "text-brand")}>{p.name}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PropertiesMenu({ db, view }: { db: Database; view: DatabaseViewConfig }) {
  const { updateView, deleteProperty, addProperty } = useStore();
  const hidden = new Set(view.hiddenPropIds ?? []);
  const toggle = (pid: string) => {
    const next = new Set(hidden);
    if (next.has(pid)) next.delete(pid);
    else next.add(pid);
    updateView(db.id, view.id, { hiddenPropIds: [...next] });
  };
  const showAll = () => updateView(db.id, view.id, { hiddenPropIds: [] });
  const hideAll = () => updateView(db.id, view.id, { hiddenPropIds: db.properties.map((p) => p.id) });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent text-muted-foreground">
          <Settings2 className="h-3 w-3" /> Properties
          {hidden.size > 0 && (
            <span className="ml-0.5 rounded-full bg-muted-foreground/20 text-[10px] px-1">
              {db.properties.length - hidden.size}/{db.properties.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between text-xs">
          <span>Visible in this view</span>
          <div className="flex gap-1 text-[10px] font-normal">
            <button onClick={showAll} className="hover:underline text-muted-foreground">Show all</button>
            <span className="text-muted-foreground/40">·</span>
            <button onClick={hideAll} className="hover:underline text-muted-foreground">Hide all</button>
          </div>
        </DropdownMenuLabel>
        {db.properties.map((p: Property) => {
          const isHidden = hidden.has(p.id);
          return (
            <DropdownMenuItem
              key={p.id}
              onSelect={(e) => e.preventDefault()}
              className="flex items-center justify-between"
            >
              <button onClick={() => toggle(p.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                {isHidden ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" /> : <Eye className="h-3.5 w-3.5 shrink-0" />}
                <span className={cn("truncate", isHidden && "text-muted-foreground line-through decoration-muted-foreground/40")}>{p.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{p.type}</span>
              </button>
              <button onClick={() => deleteProperty(db.id, p.id)} className="ml-1 text-muted-foreground hover:text-destructive" title="Delete property (all views)">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs"><Plus className="mr-2 h-3.5 w-3.5" /> Add property</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            {PROPERTY_TYPES.map((t) => (
              <DropdownMenuItem key={t} onClick={() => addProperty(db.id, t)}>
                {PROPERTY_TYPE_LABELS[t]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
