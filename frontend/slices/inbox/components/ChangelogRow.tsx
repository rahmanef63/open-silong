"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatRelTime } from "@/shared/lib/format";
import type { ChangelogEntry, ChangelogItemKind } from "../hooks/useChangelog";

const KIND_META: Record<ChangelogItemKind, { label: string; className: string }> = {
  feature: { label: "New", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  improvement: { label: "Improved", className: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  fix: { label: "Fixed", className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  breaking: { label: "Breaking", className: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};

interface Props {
  entry: ChangelogEntry;
}

export function ChangelogRow({ entry }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0 bg-brand/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition text-left"
      >
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">What's new in {entry.version}</span>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{entry.title}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{formatRelTime(entry.publishedAt)}</span>
            <span>·</span>
            <span>{entry.items.length} update{entry.items.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border/40 space-y-2 bg-card">
          <ul className="space-y-1.5">
            {entry.items.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className={cn(
                  "text-[10px] rounded border px-1.5 py-0 shrink-0 mt-0.5",
                  KIND_META[it.kind ?? "feature"].className,
                )}>
                  {KIND_META[it.kind ?? "feature"].label}
                </span>
                <span className="flex-1">{it.text}</span>
              </li>
            ))}
          </ul>
          {entry.body && (
            <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
              {entry.body}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
