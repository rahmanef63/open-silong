import { useState } from "react";
import {
  ChevronRight, MoreHorizontal, Pencil, Star, Trash2, ExternalLink,
} from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DynamicIcon, IconPickerPopover } from "@/shared/components/icon-picker";
import { useConfirm } from "@/shared/components/ConfirmProvider";
import { cn } from "@/shared/lib/utils";
import { formatRelTime } from "@/shared/lib/format";
import type { Page } from "@/shared/types/domain";
import type { pageSource } from "../../lib/groupPages";
import { SourceCell } from "./SourceCell";

const relTime = (ts: number | null | undefined) => (ts ? formatRelTime(ts) : "—");

export function PageRow({
  page, depth, hasChildren, childCount, isExpanded, onToggleExpand,
  isSelected, onToggleSelect, source, onOpen, onOpenSource, ownerLabel,
}: {
  page: Page;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  source: ReturnType<typeof pageSource>;
  onOpen: () => void;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
  ownerLabel: string;
}) {
  const { updatePage, toggleFavorite, deletePage } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const renameOp = useAsyncError(`library.pageRename.${page.id}`);
  const trashOp = useAsyncError(`library.pageTrash.${page.id}`);
  const confirm = useConfirm();

  function commitRename() {
    const next = draft.trim();
    setRenaming(false);
    if (next === page.title) return;
    void renameOp.execute(async () => { updatePage(page.id, { title: next }); });
  }

  function setIcon(icon: string) {
    if (icon === page.icon) return;
    void renameOp.execute(async () => { updatePage(page.id, { icon }); });
  }

  async function onTrash() {
    const ok = await confirm({
      title: `Move "${page.title || "Untitled"}" to trash?`,
      description: "You can restore it from the Trash within 30 days.",
      variant: "destructive",
      confirmLabel: "Move to trash",
    });
    if (!ok) return;
    void trashOp.execute(async () => { deletePage(page.id); });
  }

  return (
    <tr
      data-selected={isSelected || undefined}
      className={cn("group/row transition hover:bg-accent/40", isSelected && "bg-brand/10")}
    >
      <td className="px-3 py-1.5 align-middle">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          aria-label={`Select ${page.title || "Untitled"}`}
        />
      </td>
      <td className="px-2 py-1.5 align-middle">
        <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: depth * 16 }}>
          <button
            type="button"
            onClick={onToggleExpand}
            disabled={!hasChildren}
            aria-label={hasChildren ? (isExpanded ? "Collapse" : "Expand") : undefined}
            className={cn(
              "h-5 w-5 grid place-items-center rounded shrink-0 transition",
              hasChildren ? "hover:bg-accent text-muted-foreground" : "opacity-0 pointer-events-none",
            )}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
          </button>
          <IconPickerPopover value={page.icon} onChange={setIcon}>
            <button
              type="button"
              className="text-base shrink-0 hover:bg-accent rounded p-0.5 transition"
              aria-label="Change icon"
              onClick={(e) => e.stopPropagation()}
            >
              <DynamicIcon value={page.icon} className="text-base" />
            </button>
          </IconPickerPopover>
          {renaming ? (
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setRenaming(false); setDraft(page.title); }
              }}
              className="h-7 text-sm flex-1 min-w-0"
            />
          ) : (
            <button
              type="button"
              onClick={onOpen}
              onDoubleClick={() => { setDraft(page.title); setRenaming(true); }}
              className="flex-1 min-w-0 truncate text-left font-medium"
            >
              <span className="truncate">{page.title || "Untitled"}</span>
              {hasChildren && (
                <span className="ml-2 text-[10px] text-muted-foreground tabular-nums">
                  {childCount} sub
                </span>
              )}
            </button>
          )}
          {page.favorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
        </div>
      </td>
      <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground truncate align-middle">
        {ownerLabel}
      </td>
      <td className="hidden lg:table-cell px-2 py-1.5 text-xs text-muted-foreground truncate align-middle">
        <SourceCell source={source} onOpenSource={onOpenSource} />
      </td>
      <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground align-middle">
        {relTime(page.updatedAt)}
      </td>
      <td className="px-2 py-1.5 text-right align-middle">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover/row:opacity-100 transition data-[state=open]:opacity-100"
              aria-label="Page actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onOpen}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { setDraft(page.title); setRenaming(true); }}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toggleFavorite(page.id)}>
              <Star className={cn("mr-2 h-3.5 w-3.5", page.favorite && "fill-yellow-400 text-yellow-400")} />
              {page.favorite ? "Unfavorite" : "Favorite"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={onTrash}
              disabled={trashOp.pending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
