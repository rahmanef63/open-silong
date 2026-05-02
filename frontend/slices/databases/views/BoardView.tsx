import { Database, DatabaseViewConfig, Page, Property, SelectOption } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { useMemo } from "react";
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragEndEvent, KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector, isTextInputTarget } from "@/shared/lib/keyboard";
import { colorClass } from "@/shared/lib/format";
import { PropertyCell } from "../PropertyCell";
import { Plus } from "lucide-react";
import { getVisibleProps } from "../lib/visibility";
import { QuickCreateDialog } from "../components/QuickCreateDialog";
import { useState } from "react";
import type { PropertyValue } from "@/shared/types/domain";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function BoardView({ db, view, rows, onOpenRow }: Props) {
  const { setRowValue, updateView } = useStore();
  void updateView;
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickPrefill, setQuickPrefill] = useState<Record<string, PropertyValue>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const groupProp: Property | undefined = useMemo(() => {
    return db.properties.find(p => p.id === view.groupBy)
      ?? db.properties.find(p => p.type === "status" || p.type === "select");
  }, [db.properties, view.groupBy]);

  if (!groupProp || !groupProp.options) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Board view needs a Select or Status property.{" "}
        <button onClick={() => {/* opens settings via PropertiesMenu in toolbar */}} className="underline">Add one in Properties.</button>
      </div>
    );
  }

  const colorByProp = view.boardColorByProp
    ? db.properties.find(p => p.id === view.boardColorByProp)
    : undefined;
  const cardSize = view.boardCardSize ?? "medium";
  const cardPadding = cardSize === "small" ? "p-2" : cardSize === "large" ? "p-4" : "p-3";
  const cardSpacing = cardSize === "small" ? "space-y-1.5" : cardSize === "large" ? "space-y-3" : "space-y-2";
  const cardPropIds = view.boardCardProps;
  const viewVisible = getVisibleProps(db, view);

  let columns: { id: string | null; option?: SelectOption; rows: Page[] }[] = [
    ...groupProp.options.map(o => ({
      id: o.id, option: o,
      rows: rows.filter(r => r.rowProps?.[groupProp.id] === o.id),
    })),
    { id: null, rows: rows.filter(r => !r.rowProps?.[groupProp.id]) },
  ];
  if (view.boardHideEmptyGroups) {
    columns = columns.filter(c => c.rows.length > 0);
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    const colId = overId.startsWith("col_") ? overId.slice(4) : null;
    setRowValue(db.id, String(active.id), groupProp.id, colId === "null" || colId === null ? null : colId);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto p-3 min-h-[280px]">
        <QuickCreateDialog
          db={db}
          view={view}
          open={quickOpen}
          onOpenChange={setQuickOpen}
          prefill={quickPrefill}
          onCreated={onOpenRow}
          title="Add to board"
        />
        {columns.map(col => (
          <BoardColumn key={col.id ?? "none"} db={db} col={col} groupProp={groupProp}
            cardPadding={cardPadding} cardSpacing={cardSpacing}
            colorByProp={colorByProp} cardPropIds={cardPropIds}
            viewVisible={viewVisible}
            onAdd={() => {
              setQuickPrefill({ [groupProp.id]: col.id ?? null });
              setQuickOpen(true);
            }} onOpen={onOpenRow} />
        ))}
      </div>
    </DndContext>
  );
}

function BoardColumn({ db, col, groupProp, onAdd, onOpen, cardPadding, cardSpacing, colorByProp, cardPropIds, viewVisible }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: `col_${col.id ?? "null"}` });
  return (
    <div ref={setNodeRef} className={cn("w-64 shrink-0 rounded-lg bg-muted/40 p-2 transition", isOver && "ring-2 ring-brand bg-muted/70")}>
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          {col.option ? (
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(col.option.color))}>{col.option.name}</span>
          ) : (
            <span className="text-xs text-muted-foreground">No {groupProp.name}</span>
          )}
          <span className="text-xs text-muted-foreground">{col.rows.length}</span>
        </div>
        <button onClick={onAdd} className="rounded p-1 hover:bg-accent text-muted-foreground"><Plus className="h-3 w-3" /></button>
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
      </div>
    </div>
  );
}

function BoardCard({ row, db, onOpen, cardPadding, colorByProp, cardPropIds, viewVisible }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });
  const visibleSet = new Set<string>((viewVisible as Property[]).map((p) => p.id));
  const visibleProps: Property[] = cardPropIds?.length
    ? cardPropIds
        .map((id: string) => db.properties.find((p: Property) => p.id === id))
        .filter((p: Property | undefined): p is Property => !!p && visibleSet.has(p.id))
    : (viewVisible as Property[]).filter((p) => p.type !== "text").slice(0, 3);
  const colorOpt: { color?: string } | null = colorByProp
    ? colorByProp.options?.find((o: any) => o.id === row.rowProps?.[colorByProp.id]) ?? null
    : null;
  const accentBar = colorOpt?.color
    ? cn("border-l-4", colorClass(colorOpt.color).split(" ").find((c) => c.startsWith("border-")) ?? "")
    : "";
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (isTextInputTarget(e.target)) return;
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };
  return (
    <div
      ref={setNodeRef}
      {...attributes} {...listeners}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="button"
      data-db-nav-item
      className={cn("rounded-md bg-card border border-border shadow-soft cursor-grab active:cursor-grabbing hover:border-border-strong transition", cardPadding, accentBar, isDragging && "opacity-50")}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium mb-1">
        <span>{row.icon}</span>
        <span className="truncate">{row.title || "Untitled"}</span>
      </div>
      <div className="flex flex-wrap gap-1 -mx-1">
        {visibleProps.map((p: Property) => (
          <div key={p.id} onClick={(e) => e.stopPropagation()} className="text-xs">
            <PropertyCell db={db} prop={p} row={row} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
