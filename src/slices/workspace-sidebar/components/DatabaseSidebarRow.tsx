import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Table2, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Database } from "@/lib/types";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { DensityConfig } from "../lib/density";

interface Props {
  db: Database;
  density: DensityConfig;
}

export function DatabaseSidebarRow({ db, density }: Props) {
  const { trashDatabase, pages } = useStore();
  const navigate = useNavigate();
  const host = useMemo(
    () =>
      pages.find(
        (p) =>
          !p.trashed &&
          p.blocks.some((b) => b.type === "database" && b.databaseId === db.id),
      ),
    [pages, db.id],
  );
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 text-sidebar-foreground hover:bg-sidebar-accent group/db",
        density.pageLink,
      )}
    >
      <button
        onClick={() => host && navigate(`/p/${host.id}`)}
        className="flex flex-1 min-w-0 items-center gap-1.5 text-left"
        disabled={!host}
        title={host ? `Open ${host.title || "page"}` : "No host page"}
      >
        <Table2 className={cn("shrink-0 text-muted-foreground", density.actionIcon)} />
        <span className="flex-1 truncate">{db.name}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">{db.rowIds.length}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="opacity-0 group-hover/db:opacity-100 rounded p-0.5 hover:bg-background text-muted-foreground"
            aria-label="Database actions"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {host && (
            <DropdownMenuItem onClick={() => navigate(`/p/${host.id}`)}>
              Open host page
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => trashDatabase(db.id)}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
