import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { MoreHorizontal, Table2, Trash2 } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import type { Database } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import type { DensityConfig } from "../lib/density";

interface Props {
  db: Database;
  density: DensityConfig;
}

export function DatabaseSidebarRow({ db, density }: Props) {
  const { trashDatabase } = useStore();
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 text-sidebar-foreground hover:bg-sidebar-accent group/db",
        density.pageLink,
      )}
    >
      <Button
        variant="ghost"
        onClick={() => navigate(ROUTES.database(db.id))}
        className="flex flex-1 h-auto min-w-0 items-center gap-1.5 text-left px-0 py-0 hover:bg-transparent font-normal justify-start"
        title={`Open ${db.name || "database"}`}
      >
        <Table2 className={cn("shrink-0 text-muted-foreground", density.actionIcon)} />
        <span className="flex-1 truncate">{db.name}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">{db.rowIds.length}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover/db:opacity-100 h-auto w-auto p-0.5 hover:bg-background text-muted-foreground [&_svg]:size-3"
            aria-label="Database actions"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(ROUTES.database(db.id))}>
            Open database
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => trashDatabase(db.id)}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
