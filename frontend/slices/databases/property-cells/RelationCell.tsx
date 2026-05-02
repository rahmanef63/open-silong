import { useState } from "react";
import { AlertTriangle, Check, Link2, Plus, X } from "lucide-react";
import type { Page } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import type { CellProps } from "./types";

export function RelationCell({ db, prop, row, value, onSet, cellClass }: CellProps) {
  const { pages, databases, updateProperty, addRow } = useStore();
  const [query, setQuery] = useState("");
  const linkedIds = Array.isArray(value) ? value : [];
  const linkedResolved: Array<{ id: string; page: Page | null }> = linkedIds.map((id) => ({
    id,
    page: pages.find((p) => p.id === id && !p.trashed) ?? null,
  }));
  const linkedExisting = linkedResolved.filter((x) => x.page).map((x) => x.page!) as Page[];
  const linkedStale = linkedResolved.filter((x) => !x.page);

  const targetDbConfigured = !!prop.relationDatabaseId;
  const targetDb = prop.relationDatabaseId
    ? databases.find((d) => d.id === prop.relationDatabaseId)
    : null;
  const targetDbMissing = targetDbConfigured && !targetDb;

  const databaseRows = pages.filter((p) => !p.trashed && p.id !== row.id && p.rowOfDatabaseId);
  const fallbackPages = pages.filter((p) => !p.trashed && p.id !== row.id && !p.rowOfDatabaseId);
  const baseCandidates = databaseRows.length ? databaseRows : fallbackPages;
  const candidates = baseCandidates
    .filter((p) => !prop.relationDatabaseId || targetDbMissing || p.rowOfDatabaseId === prop.relationDatabaseId)
    .filter((p) => `${p.title} ${p.icon}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 40);

  const toggle = (id: string) => {
    onSet(linkedIds.includes(id) ? linkedIds.filter((x) => x !== id) : [...linkedIds, id]);
  };

  const stripStale = () => {
    onSet(linkedIds.filter((id) => pages.some((p) => p.id === id && !p.trashed)));
  };

  const onCreateNew = async () => {
    if (!targetDb) return;
    const title = query.trim();
    const newRow = await addRow(targetDb.id, title ? { title } : undefined);
    onSet([...linkedIds, newRow.id]);
    setQuery("");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(cellClass, "w-full text-left px-2 py-1 rounded hover:bg-accent/50 flex items-center gap-1")}>
          {targetDbMissing ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          ) : (
            <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          {targetDbMissing ? (
            <span className="text-xs text-amber-700 dark:text-amber-300">Database removed</span>
          ) : linkedExisting.length || linkedStale.length ? (
            <span className="flex min-w-0 flex-wrap gap-1">
              {linkedExisting.slice(0, 2).map((p) => (
                <span key={p.id} className="inline-flex max-w-28 items-center gap-1 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-xs">
                  <span>{p.icon}</span>
                  <span className="truncate">{p.title || "Untitled"}</span>
                </span>
              ))}
              {linkedStale.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3" /> {linkedStale.length} removed
                </span>
              )}
              {linkedExisting.length > 2 && <span className="text-xs text-muted-foreground">+{linkedExisting.length - 2}</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">Link rows</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <div className="space-y-2">
          {targetDbMissing && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                The target database for this relation no longer exists. Pick another below or clear it.
              </span>
            </div>
          )}
          {linkedStale.length > 0 && !targetDbMissing && (
            <button
              onClick={stripStale}
              className="flex w-full items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
            >
              <X className="h-3 w-3" />
              Remove {linkedStale.length} stale link{linkedStale.length === 1 ? "" : "s"}
            </button>
          )}
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
          {targetDb && (
            <button
              onClick={onCreateNew}
              className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              {query.trim() ? `Create "${query.trim()}" in ${targetDb.name}` : `Create new row in ${targetDb.name}`}
            </button>
          )}
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
