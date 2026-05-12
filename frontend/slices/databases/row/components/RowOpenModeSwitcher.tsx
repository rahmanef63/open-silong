"use client";

import { PanelRight, Maximize2, ExternalLink } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/shared/ui/tooltip";
import type { RowOpenMode } from "../lib/useRowOpenMode";

interface Props {
  /** The currently-active peek surface; doubles as the persisted default. */
  mode: RowOpenMode;
  /** Switch the peek surface AND set as the new default. */
  onPickMode: (mode: RowOpenMode) => void;
  /** One-shot: close the peek and navigate to /p/<id>. Does NOT change
   *  the persisted default. */
  onOpenAsPage: () => void;
  /** When the host context already IS a full-page DB (page renders the
   *  database as its single block), opening a row "as page" creates an
   *  awkward sibling-navigation. Pass false to hide the page button in
   *  that case. */
  showPage?: boolean;
}

export function RowOpenModeSwitcher({
  mode,
  onPickMode,
  onOpenAsPage,
  showPage = true,
}: Props) {
  return (
    <TooltipProvider>
      <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background/40 p-0.5">
        <PickButton
          label="Open in side sheet (default)"
          active={mode === "sheet"}
          onClick={() => onPickMode("sheet")}
          icon={PanelRight}
        />
        <PickButton
          label="Open in centered dialog (set as default)"
          active={mode === "dialog"}
          onClick={() => onPickMode("dialog")}
          icon={Maximize2}
        />
        {showPage && (
          <PickButton
            label="Open as full page"
            active={false}
            onClick={onOpenAsPage}
            icon={ExternalLink}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

function PickButton({
  label, active, onClick, icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: typeof PanelRight;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
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
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
