"use client";

import { PanelRight, Maximize2, ExternalLink } from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/shared/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { Button } from "@/shared/ui/button";
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
        <ToggleGroup
          type="single"
          size="sm"
          value={mode}
          onValueChange={(v) => v && onPickMode(v as RowOpenMode)}
          className="gap-0.5"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="sheet" aria-label="Open in side sheet (default)" className="h-6 w-6 p-0">
                <PanelRight className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Open in side sheet (default)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="dialog" aria-label="Open in centered dialog (set as default)" className="h-6 w-6 p-0">
                <Maximize2 className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Open in centered dialog (set as default)</TooltipContent>
          </Tooltip>
        </ToggleGroup>
        {showPage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open as full page"
                onClick={onOpenAsPage}
                className="h-6 w-6 text-muted-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Open as full page</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
