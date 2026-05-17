import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { Search, Filter, ArrowUpDown, LayoutGrid, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { FilterBuilder } from "../FilterBuilder";
import { SortBuilder } from "../SortBuilder";
import { NewRowMenu } from "@/slices/database-templates";
import type { Database, DatabaseViewConfig } from "@/shared/types/domain";

interface ToolbarProps {
  db: Database;
  view: DatabaseViewConfig;
  /** Caller decides whether non-structural writes go to block.viewOverrides
   *  (linked) or directly to db.views (canonical). */
  writeView: (viewId: string, patch: Partial<DatabaseViewConfig>) => void;
}

export function DatabaseToolbar({ db, view, writeView }: ToolbarProps) {
  const activeFilters = (view.filters ?? []).length;
  const activeSorts = (view.sorts ?? []).length;
  const locked = !!view.locked;
  const lockTitle = "View is locked — unlock from the view tab menu";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-1.5 bg-muted/30">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1 min-w-[180px]">
        <Search className="h-3.5 w-3.5 shrink-0" />
        <Input
          value={view.search ?? ""}
          onChange={(e) => writeView(view.id, { search: e.target.value })}
          placeholder={locked ? "Search disabled — view locked" : "Search rows…"}
          disabled={locked}
          title={locked ? lockTitle : undefined}
          className="h-7 text-xs border-0 bg-transparent shadow-none px-1 focus-visible:ring-0 max-w-48 disabled:opacity-50"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              disabled={locked}
              title={locked ? lockTitle : undefined}
              className={cn(
                "h-auto gap-1 rounded-md px-2 py-1 text-xs font-normal disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-3",
                activeFilters > 0 ? "text-brand bg-brand/10 hover:bg-brand/10 hover:text-brand" : "text-muted-foreground",
              )}
            >
              <Filter className="h-3 w-3" />
              Filter
              {activeFilters > 0 && <span className="ml-0.5 rounded-full bg-brand text-white text-[10px] px-1">{activeFilters}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="p-0 w-auto">
            <FilterBuilder db={db} view={view} writeView={writeView} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              disabled={locked}
              title={locked ? lockTitle : undefined}
              className={cn(
                "h-auto gap-1 rounded-md px-2 py-1 text-xs font-normal disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-3",
                activeSorts > 0 ? "text-brand bg-brand/10 hover:bg-brand/10 hover:text-brand" : "text-muted-foreground",
              )}
            >
              <ArrowUpDown className="h-3 w-3" />
              Sort
              {activeSorts > 0 && <span className="ml-0.5 rounded-full bg-brand text-white text-[10px] px-1">{activeSorts}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="p-0 w-auto">
            <SortBuilder db={db} view={view} writeView={writeView} />
          </PopoverContent>
        </Popover>

        {view.type === "board" && <GroupByButton db={db} view={view} writeView={writeView} />}

        <NewRowMenu db={db} onCreated={() => { /* row appears inline; user clicks Open to peek */ }} />
      </div>
    </div>
  );
}

function GroupByButton({ db, view, writeView }: ToolbarProps) {
  const groupProps = db.properties.filter((p) => p.type === "select" || p.type === "status");
  const current = db.properties.find((p) => p.id === view.groupBy) ?? groupProps[0];
  const locked = !!view.locked;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          disabled={locked}
          title={locked ? "View is locked — unlock from the view tab menu" : undefined}
          className="h-auto gap-1 rounded-md px-2 py-1 text-xs font-normal text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-3"
        >
          <LayoutGrid className="h-3 w-3" />
          Group: {current?.name ?? "—"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs">Group by</DropdownMenuLabel>
        {groupProps.map((p) => (
          <DropdownMenuItem key={p.id} onClick={() => writeView(view.id, { groupBy: p.id })}>
            {current?.id === p.id && <Check className="mr-2 h-3.5 w-3.5" />}
            {(!current || current.id !== p.id) && <span className="mr-2 w-3.5" />}
            {p.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
