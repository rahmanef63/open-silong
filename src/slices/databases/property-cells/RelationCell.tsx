import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import type { Page } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import type { CellProps } from "./types";

export function RelationCell({ db, prop, row, value, onSet, cellClass }: CellProps) {
  const { pages, databases, updateProperty } = useStore();
  const [query, setQuery] = useState("");
  const linkedIds = Array.isArray(value) ? value : [];
  const linked = linkedIds.map((id) => pages.find((p) => p.id === id)).filter((p): p is Page => !!p && !p.trashed);

  const databaseRows = pages.filter((p) => !p.trashed && p.id !== row.id && p.rowOfDatabaseId);
  const fallbackPages = pages.filter((p) => !p.trashed && p.id !== row.id && !p.rowOfDatabaseId);
  const baseCandidates = databaseRows.length ? databaseRows : fallbackPages;
  const candidates = baseCandidates
    .filter((p) => !prop.relationDatabaseId || p.rowOfDatabaseId === prop.relationDatabaseId)
    .filter((p) => `${p.title} ${p.icon}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 40);

  const toggle = (id: string) => {
    onSet(linkedIds.includes(id) ? linkedIds.filter((x) => x !== id) : [...linkedIds, id]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50 flex items-center gap-1")}>
          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {linked.length ? (
            <span className="flex min-w-0 flex-wrap gap-1">
              {linked.slice(0, 2).map((p) => (
                <span key={p.id} className="inline-flex max-w-28 items-center gap-1 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-xs">
                  <span>{p.icon}</span>
                  <span className="truncate">{p.title || "Untitled"}</span>
                </span>
              ))}
              {linked.length > 2 && <span className="text-xs text-muted-foreground">+{linked.length - 2}</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">Link rows</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <div className="space-y-2">
          <select
            value={prop.relationDatabaseId ?? ""}
            onChange={(e) => updateProperty(db.id, prop.id, { relationDatabaseId: e.target.value || null })}
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none"
          >
            <option value="">All database rows</option>
            {databases.map((d) => (
              <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages"
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {candidates.map((p) => {
              const selected = linkedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {selected ? <Check className="h-3.5 w-3.5 text-brand" /> : <span className="w-3.5" />}
                  <span>{p.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{p.title || "Untitled"}</span>
                </button>
              );
            })}
            {candidates.length === 0 && (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">No matching rows</div>
            )}
          </div>
          {linkedIds.length > 0 && (
            <button onClick={() => onSet([])} className="text-xs text-muted-foreground hover:text-foreground">
              Clear relation
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
