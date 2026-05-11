"use client";

import { Table as TableIcon, LayoutGrid, AlignLeft, LayoutDashboard } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

export type AdminView = "table" | "gallery" | "feed" | "dashboard";

const VIEW_META: Record<AdminView, { label: string; icon: typeof TableIcon }> = {
  table: { label: "Table", icon: TableIcon },
  gallery: { label: "Gallery", icon: LayoutGrid },
  feed: { label: "Feed", icon: AlignLeft },
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
};

export function ViewSwitcher({
  value,
  onChange,
  available,
}: {
  value: AdminView;
  onChange: (v: AdminView) => void;
  available: AdminView[];
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <div
        role="tablist"
        aria-label="View mode"
        className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
      >
        {available.map((v) => {
          const meta = VIEW_META[v];
          const Icon = meta.icon;
          const active = value === v;
          return (
            <Tooltip key={v}>
              <TooltipTrigger asChild>
                <button
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => onChange(v)}
                  className={`inline-flex items-center justify-center h-7 w-7 rounded transition ${
                    active
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {meta.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
