import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Copy, GripVertical, MoreHorizontal, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DENSITY, type DensityConfig } from "../lib/density";
import { handleTreeKey, type TreeItem } from "../lib/keyboard";

interface Props {
  item: TreeItem;
  density: DensityConfig;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onClose?: () => void;
  isOverSibling?: boolean;
  isOverNesting?: boolean;
  isExternalOver?: boolean;
  onExternalEnter?: () => void;
  onExternalLeave?: () => void;
  onExternalDrop?: (e: React.DragEvent) => void;
}

export function SortablePageRow({
  item, density, isOpen, setOpen, onClose,
  isOverSibling = false, isOverNesting = false, isExternalOver = false,
  onExternalEnter, onExternalLeave, onExternalDrop,
}: Props) {
  const { childrenOf, createPage, duplicatePage, deletePage, toggleFavorite, updatePage } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(item.page.title);
  const kids = childrenOf(item.page.id);
  const active = location.pathname === `/p/${item.page.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.page.id });

  const commitName = () => {
    updatePage(item.page.id, { title: name });
    setRenaming(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      className={cn("relative", isDragging && "opacity-30")}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-page-id")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onExternalEnter?.();
        }
      }}
      onDragLeave={onExternalLeave}
      onDrop={onExternalDrop}
    >
      {isOverSibling && (
        <div aria-hidden className="pointer-events-none absolute -top-px left-1.5 right-1.5 z-10">
          <div className="relative h-0.5 rounded-full bg-brand">
            <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-brand ring-2 ring-background" />
          </div>
        </div>
      )}
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 transition-all duration-150",
          "hover:bg-sidebar-accent/80",
          active && "bg-sidebar-accent",
          (isOverNesting || isExternalOver) &&
            "bg-brand/25 ring-2 ring-brand ring-offset-1 ring-offset-sidebar scale-[1.01]",
        )}
        style={{ paddingLeft: `${item.depth * density.indent}px` }}
      >
        <button
          onClick={() => setOpen(!isOpen)}
          className={cn("flex items-center justify-center rounded hover:bg-background/60 text-muted-foreground", density.toggle)}
          aria-label="Toggle"
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90", kids.length === 0 && "opacity-30")} />
        </button>
        <Link
          to={`/p/${item.page.id}`}
          onClick={onClose}
          data-sidebar-nav-item
          data-sidebar-tree-item
          data-sidebar-page-id={item.page.id}
          data-sidebar-parent-id={item.parentId ?? ""}
          onKeyDown={(e) => handleTreeKey(e, item, kids, isOpen, setOpen)}
          className={cn("flex min-w-0 flex-1 items-center", density.pageLink)}
        >
          <span className={cn("leading-none", density === DENSITY.compact ? "text-sm" : "text-base")}>{item.page.icon}</span>
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") { setName(item.page.title); setRenaming(false); }
              }}
              className="min-w-0 flex-1 rounded bg-background px-1 py-0.5 text-sm outline-none ring-1 ring-ring"
              onClick={(e) => e.preventDefault()}
            />
          ) : (
            <span className="truncate">{item.page.title || "Untitled"}</span>
          )}
        </Link>
        <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
          <button
            {...attributes}
            {...listeners}
            className={cn("flex items-center justify-center rounded hover:bg-background/60 text-muted-foreground cursor-grab active:cursor-grabbing", density.toggle)}
            aria-label="Drag page"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn("flex items-center justify-center rounded hover:bg-background/60 text-muted-foreground", density.toggle)} aria-label="More">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right">
              <DropdownMenuItem onClick={() => toggleFavorite(item.page.id)}>
                <Star className="mr-2 h-4 w-4" /> {item.page.favorite ? "Remove from favorites" : "Add to favorites"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRenaming(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const copy = await duplicatePage(item.page.id);
                  if (copy) navigate(`/p/${copy.id}`);
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => { deletePage(item.page.id); if (active) navigate("/"); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={async () => {
              const child = await createPage(item.page.id);
              setOpen(true);
              navigate(`/p/${child.id}`);
              onClose?.();
            }}
            className={cn("flex items-center justify-center rounded hover:bg-background/60 text-muted-foreground", density.toggle)}
            aria-label="Add subpage"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
