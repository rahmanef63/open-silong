import { Copy, GripVertical, MessageSquare, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { Block, BlockType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { BLOCK_SPECS } from "../blockSpecs";
import { BlockCommentsPopover, useBlockComments } from "@/slices/comments";
import { BlockColorMenu } from "./BlockColorMenu";

interface Props {
  pageId: string;
  block: Block;
  index: number;
  listeners?: Record<string, unknown>;
  convertTo: (t: BlockType) => void;
}

export function BlockControls({ pageId, block, index, listeners, convertTo }: Props) {
  const { addBlock, deleteBlock, duplicateBlock, updateBlock, user } = useStore();
  const { openCount, create } = useBlockComments(block.id);
  return (
    <div className="flex">
      <button
        onClick={async () => {
          const id = await addBlock(pageId, index);
          setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.focus(), 0);
        }}
        className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        aria-label="Add block below"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <BlockCommentsPopover
        pageId={pageId}
        blockId={block.id}
        trigger={
          <button
            className={cn(
              "relative flex h-6 w-5 items-center justify-center rounded hover:bg-accent",
              openCount > 0 ? "text-brand" : "text-muted-foreground",
            )}
            aria-label="Comments"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {openCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand" />
            )}
          </button>
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            {...listeners}
            className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent cursor-grab active:cursor-grabbing"
            aria-label="Drag or open block menu"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Block actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => {
            const id = duplicateBlock(pageId, block.id);
            if (id) setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.focus(), 0);
          }}>
            <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            <span className="ml-auto text-[10px] text-muted-foreground">⌘D</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            const text = window.prompt("Add comment");
            if (text?.trim()) create({ pageId, blockId: block.id, text: text.trim(), authorName: user.name, authorIcon: user.icon });
          }}>
            <MessageSquare className="mr-2 h-3.5 w-3.5" /> Add comment
            {openCount > 0 && <span className="ml-auto text-[10px] text-brand">{openCount}</span>}
          </DropdownMenuItem>
          <BlockColorMenu
            value={block.color}
            bgValue={block.bgColor}
            onPick={(color) => updateBlock(pageId, block.id, { color })}
            onPickBg={(bgColor) => updateBlock(pageId, block.id, { bgColor })}
          />
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Turn into</DropdownMenuLabel>
          {BLOCK_SPECS.filter((s) => s.type !== "page" && s.type !== "database").slice(0, 8).map((s) => (
            <DropdownMenuItem key={s.type} onClick={() => convertTo(s.type)}>
              <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteBlock(pageId, block.id)}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
