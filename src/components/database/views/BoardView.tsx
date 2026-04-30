import { Database, DatabaseViewConfig, Page, Property, SelectOption } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragEndEvent, KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector, isTextInputTarget } from "@/shared/lib/keyboard";
import { colorClass } from "@/shared/lib/format";
import { PropertyCell } from "../PropertyCell";
import { Plus } from "lucide-react";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[] }

export function BoardView({ db, view, rows }: Props) {
  const { setRowValue, updateView, addRow } = useStore();
  const navigate = useNavigate();
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

  const columns: { id: string | null; option?: SelectOption; rows: Page[] }[] = [
    ...groupProp.options.map(o => ({
      id: o.id, option: o,
      rows: rows.filter(r => r.rowProps?.[groupProp.id] === o.id),
    })),
    { id: null, rows: rows.filter(r => !r.rowProps?.[groupProp.id]) },
  ];

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
        {columns.map(col => (
          <BoardColumn key={col.id ?? "none"} db={db} col={col} groupProp={groupProp} onAdd={async () => {
            const r = await addRow(db.id, { rowProps: { [groupProp.id]: col.id ?? null } });
            navigate(`/p/${r.id}`);
          }} onOpen={(id) => navigate(`/p/${id}`)} />
        ))}
      </div>
    </DndContext>
  );
}

function BoardColumn({ db, col, groupProp, onAdd, onOpen }: any) {
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
      <div className="space-y-2">
        {col.rows.map((r: Page) => (
          <BoardCard key={r.id} row={r} db={db} onOpen={() => onOpen(r.id)} />
        ))}
      </div>
    </div>
  );
}

function BoardCard({ row, db, onOpen }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });
  const visibleProps = db.properties.filter((p: Property) => !p.hidden && p.type !== "text").slice(0, 3);
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
      className={cn("rounded-md bg-card border border-border p-3 shadow-soft cursor-grab active:cursor-grabbing hover:border-border-strong transition", isDragging && "opacity-50")}
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
