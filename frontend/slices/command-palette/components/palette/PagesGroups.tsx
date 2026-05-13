import { FileText, Star, Database as DbIcon } from "lucide-react";
import { CommandGroup, CommandItem } from "@/shared/ui/command";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { ROUTES } from "@/shared/lib/routes";
import type { Database, Page } from "@/shared/types/domain";

interface CommonProps {
  run: (fn: () => void) => () => void;
  navigate: (url: string) => void;
}

export function PagesGroup({ pages, max, run, navigate }: { pages: Page[]; max: number } & CommonProps) {
  if (pages.length === 0) return null;
  return (
    <CommandGroup heading="Pages">
      {pages.slice(0, max).map((p) => (
        <CommandItem key={p.id} value={`page:${p.title}:${p.id}`} onSelect={run(() => navigate(ROUTES.page(p.id)))}>
          <DynamicIcon value={p.icon} className="mr-2 text-base" />
          <span className="flex-1 truncate">{p.title || "Untitled"}</span>
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

export function FavoritesGroup({ pages, run, navigate }: { pages: Page[] } & CommonProps) {
  if (pages.length === 0) return null;
  return (
    <CommandGroup heading="Favorites">
      {pages.map((p) => (
        <CommandItem key={p.id} value={`fav:${p.title}:${p.id}`} onSelect={run(() => navigate(ROUTES.page(p.id)))}>
          <Star className="mr-2 h-3.5 w-3.5 fill-brand text-brand" />
          <span className="flex-1 truncate">{p.title || "Untitled"}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

export function RecentGroup({ pages, run, navigate }: { pages: Page[] } & CommonProps) {
  if (pages.length === 0) return null;
  return (
    <CommandGroup heading="Recent">
      {pages.map((p) => (
        <CommandItem key={p.id} value={`recent:${p.title}:${p.id}`} onSelect={run(() => navigate(ROUTES.page(p.id)))}>
          <DynamicIcon value={p.icon} className="mr-2 text-base" />
          <span className="flex-1 truncate">{p.title || "Untitled"}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

export function DatabasesGroup({ databases, max, run, navigate }: { databases: Database[]; max: number } & CommonProps) {
  if (databases.length === 0) return null;
  return (
    <CommandGroup heading="Databases">
      {databases.slice(0, max).map((d) => (
        <CommandItem key={d.id} value={`db:${d.name}:${d.id}`} onSelect={run(() => navigate(ROUTES.database(d.id)))}>
          <DbIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1 truncate">{d.name}</span>
          <span className="text-[10px] text-muted-foreground">{d.rowIds.length} rows</span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
