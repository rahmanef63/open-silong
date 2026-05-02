import { useRef, useState } from "react";
import { Database, DatabaseViewConfig, Page, Property, PropertyType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { PropertyCell } from "../PropertyCell";
import { PROPERTY_TYPE_LABELS } from "../DatabaseBlock";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Trash2, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector, isTextInputTarget } from "@/shared/lib/keyboard";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/shared/ui/dropdown-menu";
import { AddColumnHeader, AddRowFooter, InlineRowTitle } from "@/slices/database-row";
import { useDragFill, SelectableCell, type FillSource } from "@/slices/database-cell-selection";
import {
  RowSelectionProvider, RowMarqueeOverlay, RowSelectionToolbar, RowSelectionKeyboard,
  useRowSelectionOptional,
} from "@/slices/database-row-selection";

interface ViewProps { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function TableView({ db, view, rows, onOpenRow }: ViewProps) {
  const { reorderProperties, reorderRows, addRow, deleteRow, setRowValue } = useStore();
  const wrap = !!view.tableWrapCells;
  const rowHeight = view.tableRowHeight ?? "medium";
  const rowHeightClass =
    rowHeight === "short" ? "min-h-7" : rowHeight === "tall" ? "min-h-12" : "min-h-9";
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; propId: string } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const visibleProps = db.properties.filter(p => !p.hidden);
  const rowIds = rows.map(r => r.id);

  const onFill = (source: FillSource, targets: string[]) => {
    const srcRow = rows.find(r => r.id === source.rowId);
    if (!srcRow) return;
    const value = srcRow.rowProps?.[source.propId];
    if (value === undefined) return;
    targets.forEach(rid => setRowValue(db.id, rid, source.propId, value));
  };
  const fill = useDragFill({ rowIds, onFill });

  const onColEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = visibleProps.map(p => p.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    const hidden = db.properties.filter(p => p.hidden).map(p => p.id);
    reorderProperties(db.id, [...next, ...hidden]);
  };

  const onRowEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = rows.map(r => r.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    reorderRows(db.id, next);
  };

  return (
    <RowSelectionProvider rowOrder={rowIds}>
    <div ref={tableScrollRef} className="relative overflow-x-auto">
      <RowMarqueeOverlay containerRef={tableScrollRef} />
      <RowSelectionToolbar databaseId={db.id} />
      <RowSelectionKeyboard databaseId={db.id} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onColEnd}>
        <SortableContext items={visibleProps.map(p => p.id)} strategy={horizontalListSortingStrategy}>
          <div className="min-w-full">
            <div className="flex border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <div className="w-8 shrink-0 border-r border-border" />
              {visibleProps.map(p => <SortableHeader key={p.id} prop={p} db={db} />)}
              <AddColumnHeader dbId={db.id} />
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRowEnd}>
              <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                {rows.map((row, rowIndex) => (
                  <SortableRow
                    key={row.id}
                    row={row}
                    rowIndex={rowIndex}
                    db={db}
                    visibleProps={visibleProps}
                    onOpen={() => onOpenRow(row.id)}
                    onDelete={() => deleteRow(db.id, row.id)}
                    autoEdit={pendingFocusId === row.id}
                    onAutoEditConsumed={() => setPendingFocusId(null)}
                    selectedCell={selectedCell}
                    onSelectCell={setSelectedCell}
                    fill={fill}
                    wrap={wrap}
                    rowHeightClass={rowHeightClass}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <AddRowFooter onAdd={async () => {
              const r = await addRow(db.id);
              setPendingFocusId(r.id);
            }} />
          </div>
        </SortableContext>
      </DndContext>
    </div>
    </RowSelectionProvider>
  );
}

function SortableHeader({ prop, db }: { prop: Property; db: Database }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: prop.id });
  const { updateProperty, deleteProperty } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(prop.name);

  const commit = () => {
    setEditing(false);
    if (draft.trim()) updateProperty(db.id, prop.id, { name: draft.trim() });
    else setDraft(prop.name);
  };

  return (
    <div
      ref={setNodeRef as any}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-1 border-r border-border px-1 py-1.5 min-w-[160px] flex-1"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-foreground shrink-0">
        <GripVertical className="h-3 w-3" />
      </button>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(prop.name); } }}
          className="flex-1 bg-background border border-brand rounded px-1 text-xs outline-none min-w-0"
        />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onDoubleClick={() => { setDraft(prop.name); setEditing(true); }}
              className="flex-1 text-left truncate text-xs hover:text-foreground min-w-0"
            >
              {prop.name}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={() => { setDraft(prop.name); setEditing(true); }}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change type</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                <DropdownMenuLabel className="text-xs">Property type</DropdownMenuLabel>
                {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map(t => (
                  <DropdownMenuItem key={t} onClick={() => updateProperty(db.id, prop.id, { type: t })}>
                    {prop.type === t && <Check className="mr-2 h-3.5 w-3.5" />}
                    {prop.type !== t && <span className="mr-2 w-3.5 inline-block" />}
                    {PROPERTY_TYPE_LABELS[t]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => deleteProperty(db.id, prop.id)}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete property
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function SortableRow({ row, rowIndex, db, visibleProps, onOpen, onDelete, autoEdit, onAutoEditConsumed, selectedCell, onSelectCell, fill, wrap, rowHeightClass }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const rowSel = useRowSelectionOptional();
  const isRowSelected = !!rowSel?.isSelected(row.id);
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (isTextInputTarget(e.target)) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (e.key === "Enter" && e.target === e.currentTarget) {
      e.preventDefault();
      onOpen();
    }
  };
  return (
    <div
      ref={setNodeRef as any}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      tabIndex={0}
      data-db-nav-item
      data-row-shell-id={row.id}
      onKeyDown={onKeyDown}
      className={cn(
        "flex border-b border-border last:border-b-0 hover:bg-muted/20 group transition-colors",
        rowHeightClass,
        wrap ? "items-start" : "items-stretch",
        isDragging && "opacity-40",
        isRowSelected && "bg-brand/15 ring-2 ring-brand/60 ring-inset",
      )}
    >
      <div className="w-8 shrink-0 flex items-center justify-center border-r border-border">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground/30 hover:text-foreground opacity-0 group-hover:opacity-100">
          <GripVertical className="h-3 w-3" />
        </button>
      </div>
      {visibleProps.map((p: any, i: number) => {
        const isSel = selectedCell?.rowId === row.id && selectedCell?.propId === p.id;
        const inRange = fill.isInFillRange(rowIndex, p.id);
        return (
          <div key={p.id} className={cn(
            "border-r border-border min-w-[160px] flex-1 flex items-stretch relative",
            wrap ? "whitespace-normal break-words" : "truncate",
          )}>
            {i === 0 ? (
              <InlineRowTitle row={row} onOpen={onOpen} autoEdit={autoEdit} onAutoEditConsumed={onAutoEditConsumed} />
            ) : (
              <SelectableCell
                rowId={row.id}
                propId={p.id}
                selected={isSel}
                inFillRange={inRange}
                showFillHandle={isSel && !fill.isFilling}
                onSelect={() => onSelectCell({ rowId: row.id, propId: p.id })}
                onStartFill={() => fill.start({ rowId: row.id, propId: p.id, rowIndex })}
              >
                <PropertyCell db={db} prop={p} row={row} />
              </SelectableCell>
            )}
          </div>
        );
      })}
      <div className="w-8 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded p-1 hover:bg-accent text-muted-foreground"><MoreHorizontal className="h-3 w-3" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>Open</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
