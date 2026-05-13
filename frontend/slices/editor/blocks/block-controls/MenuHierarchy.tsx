import { toast } from "sonner";
import {
  CheckSquare, Copy, Link2, MessageSquare, Plus, Trash2,
  ArrowRightLeft, Sparkles,
} from "lucide-react";
import {
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { formatRelTime } from "@/shared/lib/format";
import { BLOCK_SPECS } from "../../blockSpecs";
import { BlockColorMenu } from "../BlockColorMenu";
import type { Block, BlockType } from "@/shared/types/domain";
import { TURN_INTO_SPECS } from "./searchRows";

interface SelectionApi { selectOne: (id: string) => void }

interface Props {
  pageId: string;
  block: Block;
  index: number;
  currentLabel: string;
  lastEditedAt?: number;
  user: { name?: string; icon?: string };
  openCount: number;
  sel: SelectionApi | null;
  closeMenu: () => void;
  setAskOpen: (o: boolean) => void;
  convertTo: (t: BlockType) => void;
  addBlock: (pageId: string, after: number, type?: BlockType) => Promise<string | undefined>;
  deleteBlock: (pageId: string, blockId: string) => void;
  duplicateBlock: (pageId: string, blockId: string) => string | undefined;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
  createComment: (input: { pageId: string; blockId: string; text: string; authorName?: string; authorIcon?: string }) => void;
}

const relTime = (ts?: number) => (ts ? formatRelTime(ts) : "");

export function MenuHierarchy(props: Props) {
  const {
    pageId, block, index, currentLabel, lastEditedAt, user, openCount, sel,
    closeMenu, setAskOpen, convertTo, addBlock, deleteBlock, duplicateBlock,
    updateBlock, createComment,
  } = props;

  return (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">{currentLabel}</DropdownMenuLabel>

      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Plus className="mr-2 h-3.5 w-3.5" /> Add new block
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-h-80 overflow-y-auto w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Insert below</DropdownMenuLabel>
          {BLOCK_SPECS.map((s) => (
            <DropdownMenuItem
              key={s.type}
              onSelect={async (e) => {
                e.preventDefault();
                const id = await addBlock(pageId, index, s.type);
                if (id) setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.focus(), 0);
                closeMenu();
              }}
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
              onSelect={(e) => { e.preventDefault(); convertTo(s.type); closeMenu(); }}
              className={cn(s.type === block.type && "bg-accent/60")}
            >
              <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
              {s.type === block.type && <span className="ml-auto text-[10px] text-muted-foreground">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); closeMenu(); setAskOpen(true); }}>
        <Sparkles className="mr-2 h-3.5 w-3.5 text-brand" /> Ask AI
        <span className="ml-auto text-[10px] text-muted-foreground">⌘J</span>
      </DropdownMenuItem>

      <BlockColorMenu
        value={block.color}
        bgValue={block.bgColor}
        onPick={(color) => updateBlock(pageId, block.id, { color })}
        onPickBg={(bgColor) => updateBlock(pageId, block.id, { bgColor })}
      />

      <DropdownMenuSeparator />

      <DropdownMenuItem onSelect={async (e) => {
        e.preventDefault();
        const url = `${window.location.origin}/dashboard/p/${pageId}#block-${block.id}`;
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Block link copied");
        } catch {
          toast.error("Copy failed");
        }
        closeMenu();
      }}>
        <Link2 className="mr-2 h-3.5 w-3.5" /> Copy link to block
        <span className="ml-auto text-[10px] text-muted-foreground">⌥⇧L</span>
      </DropdownMenuItem>

      <DropdownMenuItem onSelect={(e) => {
        e.preventDefault();
        const id = duplicateBlock(pageId, block.id);
        if (id) setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.focus(), 0);
        closeMenu();
      }}>
        <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
        <span className="ml-auto text-[10px] text-muted-foreground">⌘D</span>
      </DropdownMenuItem>

      {sel && (
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); sel.selectOne(block.id); closeMenu(); }}>
          <CheckSquare className="mr-2 h-3.5 w-3.5" /> Select block
          <span className="ml-auto text-[10px] text-muted-foreground">⌘·Shift-click</span>
        </DropdownMenuItem>
      )}

      <DropdownMenuItem
        className="text-destructive focus:text-destructive"
        onSelect={(e) => { e.preventDefault(); deleteBlock(pageId, block.id); closeMenu(); }}
      >
        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
        <span className="ml-auto text-[10px] text-muted-foreground">Del</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem onSelect={(e) => {
        e.preventDefault();
        const text = window.prompt("Add comment");
        if (text?.trim()) {
          createComment({
            pageId, blockId: block.id, text: text.trim(),
            authorName: user.name, authorIcon: user.icon,
          });
        }
        closeMenu();
      }}>
        <MessageSquare className="mr-2 h-3.5 w-3.5" /> Comment
        {openCount > 0 && <span className="ml-auto text-[10px] text-brand">{openCount}</span>}
      </DropdownMenuItem>

      <div className="px-2 py-1.5 text-[11px] text-muted-foreground border-t border-border mt-1">
        Last edited by <span className="text-foreground">{user.name || "you"}</span>
        {lastEditedAt ? <> · {relTime(lastEditedAt)}</> : null}
      </div>
    </>
  );
}
