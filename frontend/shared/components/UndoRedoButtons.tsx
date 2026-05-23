"use client";

/** UndoRedoButtons — workspace-level undo/redo, mounted in dashboard
 *  header. Backed by `useUndoRedo()` from the store; the same stack
 *  ⌘Z / ⌘⇧Z hotkeys already drive (history.ts wires the listener,
 *  with isTextInputTarget guard so contenteditable native undo still
 *  wins when typing).
 *
 *  Covers structural actions: block delete/reorder, property add/
 *  remove, row add/remove, page CRUD. Text edits inside blocks stay
 *  with the browser's native contenteditable undo. */

import { Redo2, Undo2 } from "lucide-react";
import { useUndoRedo } from "@/shared/lib/store";
import { Button } from "@/shared/ui/button";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/shared/ui/tooltip";

const isMac = typeof navigator !== "undefined"
  && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

export function UndoRedoButtons() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  return (
    <div className="hidden md:inline-flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className="h-7 w-7 text-muted-foreground disabled:opacity-30"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Undo · {MOD}Z</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className="h-7 w-7 text-muted-foreground disabled:opacity-30"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Redo · {MOD}⇧Z</TooltipContent>
      </Tooltip>
    </div>
  );
}
