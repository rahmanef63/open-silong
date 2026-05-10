"use client";

import type { ReactNode } from "react";
import { Folder, Database as DbIcon } from "lucide-react";
import { DynamicIcon } from "@/slices/icon-picker";
import { formatRelTime } from "@/shared/lib/format";
import type { Database } from "@/shared/types/domain";

interface Props {
  databases: Database[];
  onOpen: (id: string) => void;
  ownerLabel: string;
  emptyHint: ReactNode;
}

const relTime = (ts: number | null | undefined) => (ts ? formatRelTime(ts) : "—");

export function DatabasesTable({ databases, onOpen, ownerLabel, emptyHint }: Props) {
  if (databases.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-xs text-muted-foreground">
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground bg-muted/30">
          <tr>
            <th className="px-3 py-2 text-left font-normal">Name</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Created by</th>
            <th className="hidden lg:table-cell px-2 py-2 text-left font-normal">Source</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Rows</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Last edited</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {databases.map((d) => (
            <tr key={d.id} className="group/row transition hover:bg-accent/40">
              <td className="px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => onOpen(d.id)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <DynamicIcon value={d.icon} className="text-base shrink-0" />
                  <span className="truncate font-medium">{d.name || "Untitled database"}</span>
                </button>
              </td>
              <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground truncate max-w-[160px]">
                {ownerLabel}
              </td>
              <td className="hidden lg:table-cell px-2 py-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Folder className="h-3 w-3 opacity-60" />
                  Root
                </span>
              </td>
              <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <DbIcon className="h-3 w-3 opacity-60" />
                  {d.rowIds.length}
                </span>
              </td>
              <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground">
                {relTime(d.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
