"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus, ArrowRightLeft, MessageSquare, Trash2, Link2, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type { Block, BlockType } from "@/shared/types/domain";
import { BLOCK_SPECS } from "../blockSpecs";
import { TURN_INTO_SPECS } from "./block-controls/searchRows";
import { buildSmartTurnIntoPatch } from "../lib/turnInto";
import { BlockColorMenu } from "./BlockColorMenu";
import { GripButton } from "./block-controls/QuickButtons";
import { useEditorAdapter } from "@/slices/editor/lib/useEditorAdapter";
import { useBlockComments } from "@/slices/comments";

interface Props {
  block: Block;
  /** Owning page id — required for comment + block-link actions.
   *  When absent, those rows are hidden. */
  pageId?: string;
  listeners?: import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap;
  /** Local callbacks driven by the nested context (toggle children,
   *  synced children). Nested blocks live in `block.children[]`, NOT
   *  in `page.blocks[]`, so they can't use the top-level addBlock /
   *  setBlockType mutations directly. */
  onUpdate: (patch: Partial<Block>) => void;
  onAddAfter: (type?: BlockType) => void;
  onDelete: () => void;
}

/** Match BlockControls' visual contract: Menu trigger + Grip = 2 icons.
 *  Action wiring uses local callbacks instead of the store mutations
 *  (which only see top-level page.blocks). */
export function NestedBlockControls({ block, pageId, listeners, onUpdate, onAddAfter, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);
  const { user } = useEditorAdapter();
  const { openCount, create } = useBlockComments(block.id);

  return (
    <div className="flex">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title="Block menu"
            aria-label="Block menu"
            className="h-6 w-5 text-muted-foreground"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-56 p-1">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {BLOCK_SPECS.find((s) => s.type === block.type)?.label ?? block.type}
          </DropdownMenuLabel>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Plus className="mr-2 h-3.5 w-3.5" /> Add new block
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-80 overflow-y-auto w-56">
              {BLOCK_SPECS.map((s) => (
                <DropdownMenuItem
                  key={s.type}
                  onSelect={(e) => { e.preventDefault(); onAddAfter(s.type); closeMenu(); }}
                >
                  <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowRightLeft className="mr-2 h-3.5 w-3.5" /> Turn into
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-80 overflow-y-auto w-56">
              {TURN_INTO_SPECS.map((s) => (
                <DropdownMenuItem
                  key={s.type}
                  onSelect={(e) => {
                    e.preventDefault();
                    const patch = buildSmartTurnIntoPatch(block.type, s.type);
                    if (typeof window !== "undefined" && window.location.search.includes("debug=blocks")) {
                      // eslint-disable-next-line no-console
                      console.log("[turnInto:nested]", { blockId: block.id, from: block.type, to: s.type, patch });
                    }
                    onUpdate(patch);
                    closeMenu();
                  }}
                  className={cn(s.type === block.type && "bg-accent/60")}
                >
                  <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
                  {s.type === block.type && <span className="ml-auto text-[10px] text-muted-foreground">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <BlockColorMenu
            value={block.color}
            bgValue={block.bgColor}
            onPick={(color) => onUpdate({ color })}
            onPickBg={(bgColor) => onUpdate({ bgColor })}
          />

          {pageId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={async (e) => {
                e.preventDefault();
                const url = `${window.location.origin}/dashboard/p/${pageId}#block-${block.id}`;
                try { await navigator.clipboard.writeText(url); toast.success("Block link copied"); }
                catch { toast.error("Copy failed"); }
                closeMenu();
              }}>
                <Link2 className="mr-2 h-3.5 w-3.5" /> Copy link to block
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => { e.preventDefault(); onDelete(); closeMenu(); }}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>

          {pageId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => {
                e.preventDefault();
                const text = window.prompt("Add comment");
                if (text?.trim()) {
                  create({
                    pageId, blockId: block.id, text: text.trim(),
                    authorName: user.name, authorIcon: user.icon,
                  });
                }
                closeMenu();
              }}>
                <MessageSquare className="mr-2 h-3.5 w-3.5" /> Comment
                {openCount > 0 && <span className="ml-auto text-[10px] text-brand">{openCount}</span>}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <GripButton listeners={listeners} />
    </div>
  );
}
