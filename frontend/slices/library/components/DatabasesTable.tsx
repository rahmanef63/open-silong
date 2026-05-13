"use client";

import { type ReactNode } from "react";
import { Checkbox } from "@/shared/ui/checkbox";
import type { Database, Page } from "@/shared/types/domain";
import { DatabaseRow } from "./databases-table/DatabaseRow";

interface Props {
  databases: Database[];
  pages: Page[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onOpen: (id: string) => void;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
  ownerLabel: string;
  emptyHint: ReactNode;
}

/** Returns the page that hosts this database (via `databaseHostFor`),
 *  or null if the database is loose at the workspace root. */
function findDbHost(db: Database, pages: Page[]): Page | null {
  return pages.find((p) => !p.trashed && p.databaseHostFor?.includes(db.id)) ?? null;
}

export function DatabasesTable({
  databases, pages, selected, onToggle, onToggleAll, onOpen, onOpenSource,
  ownerLabel, emptyHint,
}: Props) {
  const ids = databases.map((d) => d.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));

  if (databases.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-xs text-muted-foreground">
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-[160px]" />
          <col className="w-[220px]" />
          <col className="w-[140px]" />
          <col className="w-12" />
        </colgroup>
        <thead className="text-xs text-muted-foreground bg-muted/30">
          <tr>
            <th className="px-3 py-2 text-left">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(v) => onToggleAll(ids, !!v)}
                aria-label="Select all databases"
              />
            </th>
            <th className="px-2 py-2 text-left font-normal">Name</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Created by</th>
            <th className="hidden lg:table-cell px-2 py-2 text-left font-normal">Source</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Last edited</th>
            <th className="px-2 py-2 text-right font-normal" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {databases.map((d) => (
            <DatabaseRow
              key={d.id}
              db={d}
              host={findDbHost(d, pages)}
              isSelected={selected.has(d.id)}
              onToggle={() => onToggle(d.id)}
              onOpen={() => onOpen(d.id)}
              onOpenSource={onOpenSource}
              ownerLabel={ownerLabel}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
