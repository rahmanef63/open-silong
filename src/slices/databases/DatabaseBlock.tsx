import { lazy, Suspense, useMemo, useState } from "react";
import { Block, Database, DatabaseViewConfig, DbView, Page, Property, PropertyType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import {
  Table2, LayoutGrid, List as ListIcon, Image, Calendar as CalendarIcon, Clock,
  Plus, Search, MoreHorizontal, Trash2, Eye, EyeOff, ArrowUpDown, Filter, Settings2,
  Check, Pencil, BarChart3, LayoutDashboard, Rss, Map as MapIcon, ClipboardList, Copy,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
const TableView = lazy(() => import("./views/TableView").then((m) => ({ default: m.TableView })));
const BoardView = lazy(() => import("./views/BoardView").then((m) => ({ default: m.BoardView })));
const ListView = lazy(() => import("./views/ListView").then((m) => ({ default: m.ListView })));
const GalleryView = lazy(() => import("./views/GalleryView").then((m) => ({ default: m.GalleryView })));
const CalendarView = lazy(() => import("./views/CalendarView").then((m) => ({ default: m.CalendarView })));
const TimelineView = lazy(() => import("./views/TimelineView").then((m) => ({ default: m.TimelineView })));
const ChartView = lazy(() => import("./views/ChartView").then((m) => ({ default: m.ChartView })));
const DashboardView = lazy(() => import("./views/DashboardView").then((m) => ({ default: m.DashboardView })));
const FeedView = lazy(() => import("./views/FeedView").then((m) => ({ default: m.FeedView })));
const MapView = lazy(() => import("./views/MapView").then((m) => ({ default: m.MapView })));
const FormView = lazy(() => import("./views/FormView").then((m) => ({ default: m.FormView })));
import { FilterBuilder } from "./FilterBuilder";
import { SortBuilder } from "./SortBuilder";
import { ViewOptions } from "./ViewOptions";
import { Input } from "@/shared/ui/input";
import { RowDetailSheet } from "@/slices/database-row";
import { NewRowMenu } from "@/slices/database-templates";
import { CsvActions } from "@/slices/database-csv";
import { DatabaseSkeleton } from "@/shared/components/RouteSkeleton";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

const VIEW_META: Record<DbView, { icon: any; label: string }> = {
  table: { icon: Table2, label: "Table" },
  board: { icon: LayoutGrid, label: "Board" },
  list: { icon: ListIcon, label: "List" },
  gallery: { icon: Image, label: "Gallery" },
  calendar: { icon: CalendarIcon, label: "Calendar" },
  timeline: { icon: Clock, label: "Timeline" },
  chart: { icon: BarChart3, label: "Chart" },
  dashboard: { icon: LayoutDashboard, label: "Dashboard" },
  feed: { icon: Rss, label: "Feed" },
  map: { icon: MapIcon, label: "Map" },
  form: { icon: ClipboardList, label: "Form" },
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  text: "Text", number: "Number", select: "Select", multi_select: "Multi-select",
  status: "Status", date: "Date", person: "Person", checkbox: "Checkbox",
  url: "URL", email: "Email", phone: "Phone", files: "Files", relation: "Relation",
  rollup: "Rollup", formula: "Formula", created_time: "Created time",
  created_by: "Created by", last_edited_time: "Last edited time", last_edited_by: "Last edited by",
  unique_id: "Unique ID",
};

export function DatabaseBlock({ pageId, block }: { pageId: string; block: Block }) {
  const {
    getDatabase, pages, updateDatabase, addView, updateView, deleteView,
  } = useStore();
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const db = block.databaseId ? getDatabase(block.databaseId) : undefined;
  const view = db ? db.views.find(v => v.id === db.activeViewId) ?? db.views[0] : undefined;

  const rows: Page[] = useMemo(() => {
    if (!db) return [];
    const map = new Map(pages.map(p => [p.id, p]));
    return db.rowIds.map(id => map.get(id)).filter((p): p is Page => !!p && !p.trashed);
  }, [db, pages]);

  const filtered = useMemo(() => {
    if (!view) return [];
    let out = rows;
    if (view.search?.trim()) {
      const q = view.search.toLowerCase();
      out = out.filter(p =>
        (p.title || "").toLowerCase().includes(q) ||
        Object.values(p.rowProps ?? {}).some(v => String(v ?? "").toLowerCase().includes(q))
      );
    }
    for (const f of view.filters ?? []) {
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
    if ((view.sorts ?? []).length) {
      out = [...out].sort((a, b) => {
        for (const s of view.sorts!) {
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

  if (block.databaseId && !db) {
    return <DatabaseSkeleton />;
  }
  if (db?.trashed) {
    return (
      <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-6 text-center text-sm">
        <div className="font-medium text-amber-700 dark:text-amber-400">Database moved to Trash</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Restore from <a href="/trash" className="underline">Trash</a> to view it again.
        </div>
      </div>
    );
  }
  if (!db || !view) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Database not found.
      </div>
    );
  }

  const ViewComponent = (
    {
      table: TableView, board: BoardView, list: ListView, gallery: GalleryView,
      calendar: CalendarView, timeline: TimelineView,
      chart: ChartView, dashboard: DashboardView, feed: FeedView,
      map: MapView, form: FormView,
    } as Record<DbView, any>
  )[view.type];

  const activeFilters = (view.filters ?? []).length;
  const activeSorts = (view.sorts ?? []).length;

  return (
    <div data-keyboard-scope data-database-block-root className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Top bar: db name + view tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-base">{db.icon}</span>
          <input
            value={db.name}
            onChange={e => updateDatabase(db.id, { name: e.target.value })}
            className="bg-transparent text-sm font-semibold outline-none flex-1 min-w-0 max-w-xs"
          />
        </div>
        <div className="flex items-center gap-1 max-w-full overflow-x-auto scrollbar-thin">
          {db.views.map(v => (
            <ViewTab
              key={v.id}
              db={db}
              v={v}
              active={v.id === db.activeViewId}
              onActivate={() => updateDatabase(db.id, { activeViewId: v.id })}
              onRename={(name) => updateView(db.id, v.id, { name })}
              onDuplicate={() => {
                const { id: _id, ...rest } = v;
                void _id;
                const nv = addView(db.id, { ...rest, name: `${v.name} copy` });
                updateDatabase(db.id, { activeViewId: nv.id });
              }}
              onDelete={() => {
                if (db.views.length <= 1) return;
                const next = db.views.find(x => x.id !== v.id);
                deleteView(db.id, v.id);
                if (next && v.id === db.activeViewId) updateDatabase(db.id, { activeViewId: next.id });
              }}
            />
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1 hover:bg-accent text-muted-foreground" aria-label="Add view" title="Add view">
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
                    onClick={() => {
                      const nv = addView(db.id, { name: M.label, type: t, sorts: [], filters: [], search: "" });
                      updateDatabase(db.id, { activeViewId: nv.id });
                    }}
                  >
                    <M.icon className="mr-2 h-3.5 w-3.5" /> {M.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <DatabaseMenu db={db} view={view} rows={filtered} />
        </div>
      </div>

      {/* Toolbar: search + filter/sort/group/properties + new row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-1.5 bg-muted/30">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1 min-w-[180px]">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <Input
            value={view.search ?? ""}
            onChange={e => updateView(db.id, view.id, { search: e.target.value })}
            placeholder="Search rows…"
            className="h-7 text-xs border-0 bg-transparent shadow-none px-1 focus-visible:ring-0 max-w-48"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {/* Filter button */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent transition",
                activeFilters > 0 ? "text-brand bg-brand/10" : "text-muted-foreground"
              )}>
                <Filter className="h-3 w-3" />
                Filter
                {activeFilters > 0 && <span className="ml-0.5 rounded-full bg-brand text-white text-[10px] px-1">{activeFilters}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="p-0 w-auto">
              <FilterBuilder db={db} view={view} />
            </PopoverContent>
          </Popover>

          {/* Sort button */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent transition",
                activeSorts > 0 ? "text-brand bg-brand/10" : "text-muted-foreground"
              )}>
                <ArrowUpDown className="h-3 w-3" />
                Sort
                {activeSorts > 0 && <span className="ml-0.5 rounded-full bg-brand text-white text-[10px] px-1">{activeSorts}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="p-0 w-auto">
              <SortBuilder db={db} view={view} />
            </PopoverContent>
          </Popover>

          {/* Board group-by (only in board view) */}
          {view.type === "board" && (
            <GroupByButton db={db} view={view} />
          )}

          <NewRowMenu db={db} onCreated={() => { /* row appears inline; user clicks Open to peek */ }} />
        </div>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<DatabaseSkeleton />}>
          <ViewComponent db={db} view={view} rows={filtered} onOpenRow={setOpenRowId} />
        </Suspense>
      </ErrorBoundary>
      <RowDetailSheet pageId={openRowId} onOpenChange={(o) => !o && setOpenRowId(null)} />
    </div>
  );
}

/** View tab with inline rename (double-click) and delete (context menu) */
function ViewTab({ db, v, active, onActivate, onRename, onDuplicate, onDelete }: {
  db: Database; v: DatabaseViewConfig; active: boolean;
  onActivate: () => void; onRename: (name: string) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(v.name);
  const Meta = VIEW_META[v.type];

  const commit = () => {
    setEditing(false);
    if (draft.trim()) onRename(draft.trim());
    else setDraft(v.name);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(v.name); } }}
        className="rounded-md px-2 py-1 text-xs border border-brand outline-none bg-background w-24"
      />
    );
  }

  return (
    <div className={cn(
      "group/tab flex items-center rounded-md text-xs transition select-none",
      active ? "bg-accent text-foreground font-medium" : "hover:bg-accent",
    )}>
      <button
        onClick={onActivate}
        onDoubleClick={e => { e.preventDefault(); setEditing(true); }}
        title="Click to activate · Double-click to rename"
        className="flex items-center gap-1 px-2 py-1"
      >
        <Meta.icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{v.name}</span>
      </button>
      {active && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="View actions"
              title="View actions"
              className="flex h-6 w-5 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { setDraft(v.name); setEditing(true); }}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete view
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/** Board group-by picker */
function GroupByButton({ db, view }: { db: Database; view: DatabaseViewConfig }) {
  const { updateView } = useStore();
  const groupProps = db.properties.filter(p => p.type === "select" || p.type === "status");
  const current = db.properties.find(p => p.id === view.groupBy) ?? groupProps[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent text-muted-foreground">
          <LayoutGrid className="h-3 w-3" />
          Group: {current?.name ?? "—"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs">Group by</DropdownMenuLabel>
        {groupProps.map(p => (
          <DropdownMenuItem key={p.id} onClick={() => updateView(db.id, view.id, { groupBy: p.id })}>
            {current?.id === p.id && <Check className="mr-2 h-3.5 w-3.5" />}
            {(!current || current.id !== p.id) && <span className="mr-2 w-3.5" />}
            {p.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DatabaseMenu({ db, view, rows }: { db: Database; view: DatabaseViewConfig; rows: Page[] }) {
  const { updateDatabase, trashDatabase } = useStore();
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
        <button
          onClick={() => {
            const next = window.prompt("Database icon (emoji)", db.icon);
            if (next != null && next.trim()) updateDatabase(db.id, { icon: next.trim().slice(0, 4) });
          }}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
        >
          <span className="h-3.5 w-3.5 inline-flex items-center justify-center text-base leading-none">{db.icon}</span>
          Change icon
        </button>
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
          <CsvActions db={db} rows={rows} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PropertiesMenu({ db, view }: { db: Database; view: DatabaseViewConfig }) {
  const { updateView, deleteProperty, addProperty } = useStore();
  const hidden = new Set(view.hiddenPropIds ?? []);
  const toggle = (pid: string) => {
    const next = new Set(hidden);
    if (next.has(pid)) next.delete(pid); else next.add(pid);
    updateView(db.id, view.id, { hiddenPropIds: [...next] });
  };
  const showAll = () => updateView(db.id, view.id, { hiddenPropIds: [] });
  const hideAll = () => updateView(db.id, view.id, { hiddenPropIds: db.properties.map(p => p.id) });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent text-muted-foreground">
          <Settings2 className="h-3 w-3" /> Properties
          {hidden.size > 0 && <span className="ml-0.5 rounded-full bg-muted-foreground/20 text-[10px] px-1">{db.properties.length - hidden.size}/{db.properties.length}</span>}
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
