import { Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { colorClass } from "@/shared/lib/format";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { useConfirm } from "@/shared/components/ConfirmProvider";
import type { Page, Property } from "@/shared/types/domain";

export function DayCell({
  d, ymdKey, isToday, items, colorProp, onOpenRow, onDeleteRow, onAddOnDay, hasDateProp, weekMode,
}: {
  d: Date | null;
  ymdKey: string;
  isToday: boolean;
  items: Page[];
  colorProp: Property | undefined;
  onOpenRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
  onAddOnDay: () => void;
  hasDateProp: boolean;
  weekMode: boolean;
}) {
  const droppableId = d ? `cal-day:${ymdKey}` : `cal-empty:${ymdKey}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId, disabled: !d || !hasDateProp });
  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (!d || !hasDateProp) return;
        if (e.target !== e.currentTarget) return;
        onAddOnDay();
      }}
      className={cn(
        "bg-card p-1.5 group relative",
        weekMode ? "min-h-[200px]" : "min-h-20 sm:min-h-24",
        isToday && "bg-brand/5",
        isOver && "ring-2 ring-brand bg-brand/10",
        d && hasDateProp && "cursor-copy hover:bg-accent/30",
      )}
    >
      {d && (
        <div className="flex items-center justify-between mb-1">
          <div className={cn(
            "text-[10px] w-5 h-5 flex items-center justify-center rounded-full",
            isToday ? "bg-brand text-white font-bold" : "text-muted-foreground"
          )}>
            {d.getDate()}
          </div>
          {hasDateProp && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddOnDay(); }}
              title="Add row on this date"
              className="rounded p-0.5 text-muted-foreground/30 hover:text-foreground hover:bg-accent transition opacity-60 group-hover:opacity-100"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((r) => {
          const colorOpt: { color?: string; name?: string } | null = colorProp
            ? colorProp.options?.find((o: any) => o.id === r.rowProps?.[colorProp.id]) ?? null
            : null;
          const tone = colorOpt?.color
            ? colorClass(colorOpt.color)
            : "bg-brand/15 text-brand hover:bg-brand/25";
          return (
            <DraggableEvent
              key={r.id}
              row={r}
              tone={tone}
              colorOptName={colorOpt?.name}
              onOpenRow={onOpenRow}
              onDeleteRow={onDeleteRow}
            />
          );
        })}
      </div>
    </div>
  );
}

function DraggableEvent({
  row, tone, colorOptName, onOpenRow, onDeleteRow,
}: {
  row: Page;
  tone: string;
  colorOptName?: string;
  onOpenRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });
  const confirm = useConfirm();
  return (
    <div
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      className={cn("relative group/event", isDragging && "opacity-40")}
    >
      <button
        {...attributes} {...listeners}
        onClick={() => onOpenRow(row.id)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const delta = e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 1;
            focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", delta as 1 | -1);
          }
        }}
        onContextMenu={async (e) => {
          e.preventDefault();
          const ok = await confirm({
            title: `Delete "${row.title || "Untitled"}"?`,
            description: "This row will be moved to the Trash.",
            variant: "destructive",
          });
          if (ok) onDeleteRow(row.id);
        }}
        data-db-nav-item
        title={colorOptName ?? "Click to open · Drag to change date · Right-click to delete"}
        className={cn(
          "w-full text-left truncate rounded px-1 py-0.5 text-[11px] border pr-5 cursor-grab active:cursor-grabbing touch-none",
          tone,
        )}
      >
        <DynamicIcon value={row.icon} className="text-[11px] mr-1 inline-flex" />{row.title || "Untitled"}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0.5 right-0.5 opacity-0 group-hover/event:opacity-100 rounded p-0.5 hover:bg-background/60 text-current"
            aria-label="Event actions"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpenRow(row.id)}>Open</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRow(row.id)}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
