"use client";

import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { ChangelogEntry } from "./types";
import { ITEM_KIND_META } from "./types";

interface Props {
  entries: ChangelogEntry[];
  selectedId: string | null;
  onSelect: (entry: ChangelogEntry | null) => void;
}

export function ChangelogList({ entries, selectedId, onSelect }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="text-xs font-medium text-muted-foreground">{entries.length} entries</div>
        <Button size="sm" variant="outline" onClick={() => onSelect(null)} className="h-7 text-xs">
          + New
        </Button>
      </div>
      {entries.length === 0 ? (
        <div className="px-3 py-8 text-center text-xs text-muted-foreground">
          No changelog yet. Click <span className="font-medium">+ New</span> to draft one.
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
          {entries.map((e) => (
            <button
              key={e._id}
              onClick={() => onSelect(e)}
              className={cn(
                "w-full text-left px-3 py-2.5 hover:bg-accent/40 transition-colors",
                selectedId === e._id && "bg-accent/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-xs font-semibold">{e.version}</div>
                <span className={cn(
                  "text-[10px] rounded border px-1.5 py-0",
                  e.publishedAt
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-muted bg-muted text-muted-foreground",
                )}>
                  {e.publishedAt ? "Published" : "Draft"}
                </span>
              </div>
              <div className="text-xs mt-0.5 line-clamp-1">{e.title}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {e.items.slice(0, 4).map((it, i) => (
                  <span
                    key={i}
                    className={cn(
                      "text-[10px] rounded border px-1.5 py-0",
                      ITEM_KIND_META[it.kind ?? "feature"].className,
                    )}
                  >
                    {ITEM_KIND_META[it.kind ?? "feature"].label}
                  </span>
                ))}
                {e.items.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{e.items.length - 4}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
