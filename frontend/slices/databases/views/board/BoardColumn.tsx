import { useDroppable, useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { colorClass } from "@/shared/lib/format";
import type { Page } from "@/shared/types/domain";
import { Button } from "@/shared/ui/button";
import { BoardCard } from "./BoardCard";

export function BoardColumn({ db, col, groupProp, onAdd, onOpen, cardPadding, cardSpacing, colorByProp, cardPropIds, viewVisible }: any) {
  // Sortable identity for column reorder — separate from `col_*` drop
  // target so cards continue to drop into columns without triggering a
  // sort. BoardView's custom collisionDetection filters colsort_* OUT
  // when active is a card, so the two registrations don't fight.
  const sortable = useSortable({ id: `colsort_${col.id ?? "null"}`, disabled: col.id === null });
  const drop = useDroppable({ id: `col_${col.id ?? "null"}` });
  const setRefs = (el: HTMLElement | null) => {
    sortable.setNodeRef(el);
    drop.setNodeRef(el);
  };
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  // Highlight any column the user could drop a CARD into right now.
  // `drop.isOver` only fires when the cursor is over THIS column's
  // useDroppable, but cards rendered inside the column register as
  // row-id drop targets too — so we also light up when the active row
  // is currently over one of our own cards.
  const { active, over } = useDndContext();
  const isCardDrag = !!active && !String(active.id).startsWith("colsort_");
  const overId = over ? String(over.id) : null;
  const myColumnTokens = [`col_${col.id ?? "null"}`, `colsort_${col.id ?? "null"}`];
  const overChild = !!overId && col.rows.some((r: Page) => r.id === overId);
  const droppableHover = isCardDrag && (
    drop.isOver
    || overChild
    || (overId !== null && myColumnTokens.includes(overId))
  );

  return (
    <div
      ref={setRefs}
      style={style}
      className={cn(
        "w-64 shrink-0 rounded-lg bg-muted/40 p-2 transition-all",
        droppableHover && "ring-2 ring-brand bg-brand/5 shadow-md",
        sortable.isDragging && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          {col.id !== null && (
            <Button
              variant="ghost"
              size="icon"
              {...sortable.attributes}
              {...sortable.listeners}
              aria-label="Reorder column"
              className="h-auto w-auto p-0.5 text-muted-foreground cursor-grab active:cursor-grabbing [&_svg]:size-3"
            >
              <GripVertical className="h-3 w-3" />
            </Button>
          )}
          {col.option ? (
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(col.option.color))}>{col.option.name}</span>
          ) : (
            <span className="text-xs text-muted-foreground">No {groupProp.name}</span>
          )}
          <span className="text-xs text-muted-foreground">{col.rows.length}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onAdd} className="h-auto w-auto p-1 text-muted-foreground [&_svg]:size-3"><Plus className="h-3 w-3" /></Button>
      </div>
      <div className={cardSpacing}>
        {col.rows.map((r: Page) => (
          <BoardCard
            key={r.id} row={r} db={db}
            onOpen={() => onOpen(r.id)}
            cardPadding={cardPadding}
            colorByProp={colorByProp}
            cardPropIds={cardPropIds}
            viewVisible={viewVisible}
          />
        ))}
        {droppableHover && col.rows.length === 0 && (
          <div className="rounded-md border-2 border-dashed border-brand/50 bg-brand/5 px-3 py-6 text-center text-xs text-brand">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
