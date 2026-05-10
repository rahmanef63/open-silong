"use client";

import type { ReactNode } from "react";
import { Folder, FileText, Database as DbIcon } from "lucide-react";
import { Checkbox } from "@/shared/ui/checkbox";
import { DynamicIcon } from "@/slices/icon-picker";
import { cn } from "@/shared/lib/utils";
import { formatRelTime } from "@/shared/lib/format";
import type { Database, Page } from "@/shared/types/domain";
import { pageSource } from "../lib/groupPages";

interface Props {
  pages: Page[];
  allPages: Page[];
  databases: Database[];
  recentIds: string[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onOpen: (id: string) => void;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
  ownerLabel: string;
  emptyHint: ReactNode;
}

const relTime = (ts: number | null | undefined) => (ts ? formatRelTime(ts) : "—");

export function PagesTable({
  pages, allPages, databases, recentIds, selected, onToggle, onToggleAll, onOpen,
  onOpenSource, ownerLabel, emptyHint,
}: Props) {
  const lastVisitedMap = new Map(recentIds.map((id, i) => [id, recentIds.length - i]));
  const ids = pages.map((p) => p.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));

  if (pages.length === 0) {
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
            <th className="px-3 py-2 text-left w-8">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(v) => onToggleAll(ids, !!v)}
                aria-label="Select all"
              />
            </th>
            <th className="px-2 py-2 text-left font-normal">Name</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Created by</th>
            <th className="hidden lg:table-cell px-2 py-2 text-left font-normal">Source</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Last edited</th>
            <th className="hidden xl:table-cell px-2 py-2 text-left font-normal">Last visited</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pages.map((p) => {
            const isSelected = selected.has(p.id);
            const lvRank = lastVisitedMap.get(p.id);
            const lastVisitedLabel = lvRank
              ? lvRank === recentIds.length ? "just now" : `#${recentIds.length - lvRank + 1}`
              : "—";
            const src = pageSource(p, allPages, databases);
            return (
              <tr
                key={p.id}
                data-selected={isSelected || undefined}
                className={cn(
                  "group/row transition hover:bg-accent/40",
                  isSelected && "bg-brand/10",
                )}
              >
                <td className="px-3 py-1.5">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggle(p.id)}
                    aria-label={`Select ${p.title || "Untitled"}`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => onOpen(p.id)}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <DynamicIcon value={p.icon} className="text-base shrink-0" />
                    <span className="truncate font-medium">{p.title || "Untitled"}</span>
                  </button>
                </td>
                <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground truncate max-w-[160px]">
                  {ownerLabel}
                </td>
                <td className="hidden lg:table-cell px-2 py-1.5 text-xs text-muted-foreground truncate max-w-[280px]">
                  <SourceCell source={src} onOpenSource={onOpenSource} />
                </td>
                <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground">
                  {relTime(p.updatedAt)}
                </td>
                <td className="hidden xl:table-cell px-2 py-1.5 text-xs text-muted-foreground">
                  {lastVisitedLabel}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SourceCell({
  source,
  onOpenSource,
}: {
  source: ReturnType<typeof pageSource>;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
}) {
  if (source.kind === "root") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Folder className="h-3 w-3 opacity-60" />
        <span>Root</span>
      </span>
    );
  }
  const Icon = source.kind === "database" ? DbIcon : FileText;
  const label = (
    <span className="inline-flex items-center gap-1.5">
      {source.icon ? (
        <DynamicIcon value={source.icon} className="text-xs" />
      ) : (
        <Icon className="h-3 w-3 opacity-60" />
      )}
      <span className="truncate">{source.label}</span>
    </span>
  );
  if (onOpenSource && source.targetId) {
    return (
      <button
        type="button"
        onClick={() => onOpenSource(source.kind === "database" ? "database" : "page", source.targetId!)}
        className="hover:text-foreground transition truncate"
      >
        {label}
      </button>
    );
  }
  return label;
}
