import { useMemo, useState } from "react";
import {
  CheckSquare, Copy, GripVertical, Link2, MessageSquare, MoreHorizontal,
  Plus, Trash2, Search, ArrowRightLeft, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/shared/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/ui/popover";
import type { Block, BlockType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { formatRelTime } from "@/shared/lib/format";
import { BLOCK_SPECS } from "../blockSpecs";
import { BlockCommentsPopover, useBlockComments } from "@/slices/comments";
import { BlockColorMenu } from "./BlockColorMenu";
import { useBlockSelectionOptional } from "@/slices/block-selection";
import { AskAIPanel } from "./AskAIPopover";

interface Props {
  pageId: string;
  block: Block;
  index: number;
  listeners?: import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap;
  convertTo: (t: BlockType) => void;
  askOpen?: boolean;
  onAskOpenChange?: (o: boolean) => void;
}

const relTime = (ts?: number) => (ts ? formatRelTime(ts) : "");

const TURN_INTO_SPECS = BLOCK_SPECS.filter((s) => s.type !== "database");

export function BlockControls({ pageId, block, index, listeners, convertTo, askOpen, onAskOpenChange }: Props) {
  const { addBlock, deleteBlock, duplicateBlock, updateBlock, user, getPage } = useStore();
  const { openCount, create } = useBlockComments(block.id);
  const sel = useBlockSelectionOptional();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [askOpenLocal, setAskOpenLocal] = useState(false);
  const askIsOpen = askOpen ?? askOpenLocal;
  const setAskOpen = onAskOpenChange ?? setAskOpenLocal;

  const currentSpec = BLOCK_SPECS.find((s) => s.type === block.type);
  const currentLabel = currentSpec?.label ?? block.type;
  const page = getPage(pageId);
  const lastEditedAt = page?.updatedAt;

  // Each row is searchable by label + keywords. When `q` is non-empty,
  // we render a flat filtered list (Notion-style). When empty, the
  // hierarchical menu (Turn into / Color / actions) renders normally.
  const actionRows = useMemo(() => {
    const insertItems = BLOCK_SPECS.map((s) => ({
      key: `insert:${s.type}`,
      label: `Add ${s.label.toLowerCase()} below`,
      keywords: ["add", "new", "block", "insert", s.label.toLowerCase(), ...s.keywords],
      icon: s.icon,
      run: async () => {
        const id = await addBlock(pageId, index, s.type);
        if (id) setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.focus(), 0);
      },
    }));
    const turnItems = TURN_INTO_SPECS.map((s) => ({
      key: `turn:${s.type}`,
      label: `Turn into ${s.label}`,
      keywords: ["turn", "into", "convert", "transform", s.label.toLowerCase(), ...s.keywords],
      icon: s.icon,
      run: () => convertTo(s.type),
    }));
    return [...insertItems, ...turnItems];
  }, [addBlock, convertTo, pageId, index]);

  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return actionRows.filter((r) => {
      if (r.label.toLowerCase().includes(needle)) return true;
      return r.keywords.some((kw) => kw.includes(needle));
    }).slice(0, 60);
  }, [q, actionRows]);

  const closeMenu = () => { setOpen(false); setQ(""); };

  return (
    <Popover open={askIsOpen} onOpenChange={setAskOpen}>
      <PopoverAnchor asChild>
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
      <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
        <DropdownMenuTrigger asChild>
          <button
            title="Block menu"
            aria-label="Block menu"
            className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-64 p-0">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  // Let Esc bubble (closes menu); intercept others so radix
                  // doesn't steal arrow / typing keys.
                  if (e.key !== "Escape" && e.key !== "ArrowDown" && e.key !== "ArrowUp") {
                    e.stopPropagation();
                  }
                }}
                placeholder="Search actions…"
                className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto py-1">
            {q.trim() ? (
              filteredRows.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No actions match &ldquo;{q}&rdquo;.
                </div>
              ) : (
                filteredRows.map((r) => (
                  <DropdownMenuItem
                    key={r.key}
                    onSelect={async (e) => { e.preventDefault(); await r.run(); closeMenu(); }}
                  >
                    <r.icon className="mr-2 h-3.5 w-3.5" /> {r.label}
                  </DropdownMenuItem>
                ))
              )
            ) : (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {currentLabel}
                </DropdownMenuLabel>

                {/* Add new block — keep per user request */}
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

                {/* Turn into — full list */}
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

                <DropdownMenuItem onSelect={(e) => {
                  e.preventDefault();
                  closeMenu();
                  setAskOpen(true);
                }}>
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

                <div className="px-2 py-1.5 text-[11px] text-muted-foreground border-t border-border mt-1">
                  Last edited by <span className="text-foreground">{user.name || "you"}</span>
                  {lastEditedAt ? <> · {relTime(lastEditedAt)}</> : null}
                </div>
              </>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        {...listeners}
        data-block-grip
        title="Drag to move · Shift-click range · ⌘-click toggle"
        aria-label="Drag block"
        className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-80 p-2" align="start" side="bottom" sideOffset={6}>
        <AskAIPanel pageId={pageId} block={block} index={index} onClose={() => setAskOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

