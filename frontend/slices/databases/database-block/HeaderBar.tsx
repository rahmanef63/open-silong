import { useStore } from "@/shared/lib/store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Plus, Maximize2, Link2, Lock } from "lucide-react";
import { DynamicIcon, IconPickerPopover, DEFAULT_DATABASE_ICON } from "@/shared/components/icon-picker";
import { ViewTab } from "./ViewTab";
import { DatabaseMenu } from "./DatabaseMenu";
import { VIEW_META } from "./lazyViews";
import type { Database, DatabaseViewConfig, DbView, Page } from "@/shared/types/domain";

export function DatabaseHeaderBar({
  db,
  view,
  rows,
  isInline,
  isLinked,
  onOpenAsPage,
  activeViewId,
  onActivateView,
}: {
  db: Database;
  view: DatabaseViewConfig;
  rows: Page[];
  isInline: boolean;
  isLinked: boolean;
  onOpenAsPage: () => void;
  /** Source-of-truth active view id (block override or db default). */
  activeViewId?: string;
  /** Caller decides whether to write to block (linked) or db (canonical). */
  onActivateView: (viewId: string) => void;
}) {
  const { updateDatabase, addView, updateView, deleteView } = useStore();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <IconPickerPopover
          value={db.icon}
          onChange={(next) => updateDatabase(db.id, { icon: next })}
          onClear={() => updateDatabase(db.id, { icon: DEFAULT_DATABASE_ICON })}
        >
          <button type="button" className="rounded hover:bg-accent p-0.5 text-base leading-none" aria-label="Change database icon">
            <DynamicIcon value={db.icon} fallback={DEFAULT_DATABASE_ICON} />
          </button>
        </IconPickerPopover>
        <input
          value={db.name}
          onChange={(e) => updateDatabase(db.id, { name: e.target.value })}
          className="bg-transparent text-sm font-semibold outline-none flex-1 min-w-0 max-w-xs"
        />
        {isInline && (
          <button
            type="button"
            onClick={onOpenAsPage}
            title="Open as page"
            aria-label="Open database as page"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
        {isLinked && (
          <span
            title="This database is also embedded on other pages — edits sync everywhere."
            className="ml-1 inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/5 px-1.5 py-0.5 text-[10px] font-medium text-brand"
          >
            <Link2 className="h-3 w-3" /> linked
          </span>
        )}
        {db.locked && (
          <span
            title="Database is locked — property and view structural edits are gated. Toggle in the database menu."
            className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
          >
            <Lock className="h-3 w-3" /> locked
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 max-w-full overflow-x-auto scrollbar-thin">
        {db.views.map((v) => (
          <ViewTab
            key={v.id}
            db={db}
            v={v}
            active={v.id === activeViewId}
            onActivate={() => onActivateView(v.id)}
            onRename={(name) => updateView(db.id, v.id, { name })}
            onDuplicate={() => {
              const { id: _id, ...rest } = v;
              void _id;
              const cloned = structuredClone(rest);
              const nv = addView(db.id, { ...cloned, name: `${v.name} copy` });
              onActivateView(nv.id);
            }}
            onDelete={() => {
              if (db.views.length <= 1) return;
              const next = db.views.find((x) => x.id !== v.id);
              deleteView(db.id, v.id);
              if (next && v.id === activeViewId) onActivateView(next.id);
            }}
          />
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded p-1 hover:bg-accent text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Add view"
              title={db.locked ? "Database locked — unlock to add views" : "Add view"}
              disabled={db.locked}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs">Add view</DropdownMenuLabel>
            {(Object.keys(VIEW_META) as DbView[]).map((t) => {
              const M = VIEW_META[t];
              return (
                <DropdownMenuItem
                  key={t}
                  onClick={() => {
                    const nv = addView(db.id, { name: M.label, type: t, sorts: [], filters: [], search: "" });
                    onActivateView(nv.id);
                  }}
                >
                  <M.icon className="mr-2 h-3.5 w-3.5" /> {M.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <DatabaseMenu db={db} view={view} rows={rows} />
      </div>
    </div>
  );
}
