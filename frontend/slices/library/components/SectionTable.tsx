"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Checkbox } from "@/shared/ui/checkbox";
import { DynamicIcon } from "@/slices/icon-picker";
import { cn } from "@/shared/lib/utils";
import type { Page } from "@/shared/types/domain";
import { pageBreadcrumb } from "../lib/groupPages";

interface Props {
  label: string;
  pages: Page[];
  allPages: Page[];
  workspaceName?: string;
  recentIds: string[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onOpen: (id: string) => void;
  defaultOpen?: boolean;
  ownerLabel: string;
  emptyHint: ReactNode;
}

function relTime(ts: number | null | undefined) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function SectionTable({
  label, pages, allPages, workspaceName, recentIds, selected, onToggle, onToggleAll, onOpen,
  defaultOpen = true, ownerLabel, emptyHint,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const lastVisitedMap = new Map(recentIds.map((id, i) => [id, recentIds.length - i]));
  const ids = pages.map((p) => p.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition"
      >
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{pages.length}</span>
      </button>

      {open && (
        <div className="border-t border-border">
          {pages.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">{emptyHint}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left w-8">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => onToggleAll(ids, !!v)}
                      aria-label="Select all in section"
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
                  const crumb = pageBreadcrumb(p, allPages, workspaceName);
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
                        {crumb || "—"}
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
          )}
        </div>
      )}
    </section>
  );
}
