import { Library, Search, Plus } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

export function LibraryHeader({
  workspaceName, filter, onFilterChange, onNewPage,
}: {
  workspaceName: string;
  filter: string;
  onFilterChange: (v: string) => void;
  onNewPage: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="grid place-items-center h-9 w-9 rounded-md bg-brand/10 text-brand">
          <Library className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Library</h1>
          <p className="text-xs text-muted-foreground">
            Browse, select, and bulk-edit every page in {workspaceName}.
          </p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter by title…"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="pl-7 h-9 w-56"
          />
        </div>
        <Button size="sm" onClick={onNewPage}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New page
        </Button>
      </div>
    </header>
  );
}
