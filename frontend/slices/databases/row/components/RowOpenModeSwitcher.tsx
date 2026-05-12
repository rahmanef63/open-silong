"use client";

import { PanelRight, Maximize2, ExternalLink } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/shared/ui/tooltip";
import type { RowOpenMode } from "../lib/useRowOpenMode";

interface Props {
  mode: RowOpenMode;
  onChange: (mode: RowOpenMode) => void;
}

const ITEMS: ReadonlyArray<{ id: RowOpenMode; icon: typeof PanelRight; label: string }> = [
  { id: "sheet",  icon: PanelRight,    label: "Open in side sheet" },
  { id: "dialog", icon: Maximize2,     label: "Open in centered dialog" },
  { id: "page",   icon: ExternalLink,  label: "Open as full page" },
];

export function RowOpenModeSwitcher({ mode, onChange }: Props) {
  return (
    <TooltipProvider>
      <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background/40 p-0.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={item.label}
                  aria-pressed={active}
                  onClick={() => onChange(item.id)}
                  className={cn(
                    "h-6 w-6 grid place-items-center rounded transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
