import { useMemo, useState } from "react";
import { Block, DbView, Page, Property, PropertyType, PropertyValue } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Table2, LayoutGrid, List as ListIcon, Image, Calendar as CalendarIcon, Clock,
  Plus, Search, MoreHorizontal, Trash2, Eye, EyeOff, ArrowUpDown, Filter, Settings2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { TableView } from "./views/TableView";
import { BoardView } from "./views/BoardView";
import { ListView } from "./views/ListView";
import { GalleryView } from "./views/GalleryView";
import { CalendarView } from "./views/CalendarView";
import { TimelineView } from "./views/TimelineView";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const VIEW_META: Record<DbView, { icon: any; label: string }> = {
  table: { icon: Table2, label: "Table" },
  board: { icon: LayoutGrid, label: "Board" },
  list: { icon: ListIcon, label: "List" },
  gallery: { icon: Image, label: "Gallery" },
  calendar: { icon: CalendarIcon, label: "Calendar" },
  timeline: { icon: Clock, label: "Timeline" },
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  text: "Text", number: "Number", select: "Select", multi_select: "Multi-select",
  status: "Status", date: "Date", person: "Person", checkbox: "Checkbox",
  url: "URL", email: "Email", phone: "Phone", files: "Files", relation: "Relation",
  rollup: "Rollup", formula: "Formula", created_time: "Created time",
  created_by: "Created by", last_edited_time: "Last edited time", last_edited_by: "Last edited by",
};

export function DatabaseBlock({ pageId, block }: { pageId: string; block: Block }) {
  const {
    getDatabase, pages, updateDatabase, addRow, addView, updateView, addProperty, updateProperty,
    deleteProperty,
  } = useStore();
  const navigate = useNavigate();

  const db = block.databaseId ? getDatabase(block.databaseId) : undefined;
  if (!db) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Database not found.
      </div>
    );
  }

  const view = db.views.find(v => v.id === db.activeViewId) ?? db.views[0];

  const rows: Page[] = useMemo(() => {
    const map = new Map(pages.map(p => [p.id, p]));
    return db.rowIds.map(id => map.get(id)).filter((p): p is Page => !!p && !p.trashed);
  }, [db.rowIds, pages]);

  const filtered = useMemo(() => {
    let out = rows;
    if (view.search.trim()) {
      const q = view.search.toLowerCase();
      out = out.filter(p =>
        (p.title || "").toLowerCase().includes(q) ||
        Object.values(p.rowProps ?? {}).some(v => String(v ?? "").toLowerCase().includes(q))
      );
    }
    for (const f of view.filters) {
      out = out.filter(p => {
        const v = p.rowProps?.[f.propertyId];
        switch (f.op) {
          case "contains": return String(v ?? "").toLowerCase().includes((f.value ?? "").toLowerCase());
          case "equals": return String(v ?? "") === (f.value ?? "");
          case "not_empty": return v !== undefined && v !== null && v !== "";
          case "is_empty": return v === undefined || v === null || v === "";
          case "checked": return v === true;
          case "unchecked": return v !== true;
        }
      });
    }
    if (view.sorts.length) {
      out = [...out].sort((a, b) => {
        for (const s of view.sorts) {
          const av = a.rowProps?.[s.propertyId];
          const bv = b.rowProps?.[s.propertyId];
          const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
          if (cmp !== 0) return s.direction === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    }
    return out;
  }, [rows, view]);

  const ViewComponent = (
    {
      table: TableView, board: BoardView, list: ListView, gallery: GalleryView,
      calendar: CalendarView, timeline: TimelineView,
    } as Record<DbView, any>
  )[view.type];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">{db.icon}</span>
          <input
            value={db.name}
            onChange={e => updateDatabase(db.id, { name: e.target.value })}
            className="bg-transparent text-sm font-semibold outline-none w-48"
          />
        </div>
        <div className="flex items-center gap-1">
          {db.views.map(v => {
            const Meta = VIEW_META[v.type];
            const active = v.id === db.activeViewId;
            return (
              <button
                key={v.id}
                onClick={() => updateDatabase(db.id, { activeViewId: v.id })}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent transition",
                  active && "bg-accent text-foreground font-medium"
                )}
              >
                <Meta.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{v.name}</span>
              </button>
            );
          })}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1 hover:bg-accent text-muted-foreground" aria-label="Add view">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Add view</DropdownMenuLabel>
              {(Object.keys(VIEW_META) as DbView[]).map(t => {
                const M = VIEW_META[t];
                return (
                  <DropdownMenuItem
                    key={t}
                    onClick={() => addView(db.id, { name: M.label, type: t, sorts: [], filters: [], search: "" })}
                  >
                    <M.icon className="mr-2 h-3.5 w-3.5" /> {M.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 bg-muted/30">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <Input
            value={view.search}
            onChange={e => updateView(db.id, view.id, { search: e.target.value })}
            placeholder="Search rows…"
            className="h-7 text-xs border-0 bg-transparent shadow-none px-1 focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-1">
          <SortFilterMenu db={db} view={view} />
          <PropertiesMenu db={db} />
          <button
            onClick={() => {
              const row = addRow(db.id);
              navigate(`/p/${row.id}`);
            }}
            className="flex items-center gap-1 rounded-md bg-foreground text-background px-2 py-1 text-xs hover:opacity-90"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
      </div>

      <ViewComponent db={db} view={view} rows={filtered} />
    </div>
  );
}

function SortFilterMenu({ db, view }: any) {
  const { updateView } = useStore();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent text-muted-foreground">
          <ArrowUpDown className="h-3 w-3" /> Sort
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
        {db.properties.map((p: Property) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => updateView(db.id, view.id, { sorts: [{ propertyId: p.id, direction: "asc" }] })}
          >
            {p.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => updateView(db.id, view.id, { sorts: [] })}>Clear sort</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PropertiesMenu({ db }: any) {
  const { updateProperty, deleteProperty, addProperty } = useStore();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent text-muted-foreground">
          <Settings2 className="h-3 w-3" /> Properties
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-xs">Visible properties</DropdownMenuLabel>
        {db.properties.map((p: Property) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={(e) => e.preventDefault()}
            className="flex items-center justify-between"
          >
            <span className="truncate">{p.name}</span>
            <div className="flex gap-1">
              <button onClick={() => updateProperty(db.id, p.id, { hidden: !p.hidden })} className="text-muted-foreground hover:text-foreground">
                {p.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => deleteProperty(db.id, p.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs"><Plus className="mr-2 h-3.5 w-3.5" /> Add property</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map(t => (
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
