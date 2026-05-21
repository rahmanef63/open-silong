import { useRef, useState } from "react";
import { Database, DatabaseViewConfig, Page } from "@/shared/types/domain";
import { useDbAdapter } from "../lib/useDbAdapter";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { AddColumnHeader, AddRowFooter } from "../row";
import { useDragFill, type FillSource } from "@/slices/database-cell-selection";
import { RowMarqueeOverlay } from "../row-selection";
import { getVisibleProps } from "../lib/visibility";
import { buildSubItemsTree } from "../lib/subItemsTree";
import { HeaderCheckboxGutter } from "./table/Checkboxes";
import { SortableHeader } from "./table/SortableHeader";
import { SortableRow } from "./table/SortableRow";
import { CalcFooter } from "./table/CalcFooter";

interface ViewProps {
  db: Database;
  view: DatabaseViewConfig;
  rows: Page[];
  onOpenRow: (id: string) => void;
  writeView?: (viewId: string, patch: Partial<DatabaseViewConfig>) => void;
}

export function TableView({ db, view, rows, onOpenRow, writeView }: ViewProps) {
  const { reorderProperties, reorderRows, addRow, deleteRow, setRowValue } = useDbAdapter();
  const wrap = !!view.tableWrapCells;
  const rowHeight = view.tableRowHeight ?? "medium";
  const rowHeightClass =
    rowHeight === "short" ? "min-h-7" : rowHeight === "tall" ? "min-h-12" : "min-h-9";
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; propId: string } | null>(null);
  // Sub-items expand state — persists per-view via writeView when
  // available (linked DB blocks override per-block; canonical view
  // writes to db). Empty/undefined `view.subItemsExpanded` means
  // "all expanded by default".
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(() => new Set(view.subItemsExpanded ?? []));
  const expanded = view.subItemsExpanded ? new Set(view.subItemsExpanded) : localExpanded;
  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (writeView) writeView(view.id, { subItemsExpanded: [...next] });
    else setLocalExpanded(next);
  };
  const tree = buildSubItemsTree(db, rows, expanded.size === 0 && db.subItemsParentPropId
    ? new Set(rows.map((r) => r.id))
    : expanded);
  const treeEnabled = !!db.subItemsParentPropId;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const visibleProps = getVisibleProps(db, view);
  const rowIds = rows.map((r) => r.id);

  const onFill = (source: FillSource, targets: string[]) => {
    const srcRow = rows.find((r) => r.id === source.rowId);
    if (!srcRow) return;
    const value = srcRow.rowProps?.[source.propId];
    if (value === undefined) return;
    targets.forEach((rid) => setRowValue(db.id, rid, source.propId, value));
  };
  const fill = useDragFill({ rowIds, onFill });

  const onColEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = visibleProps.map((p) => p.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    const hiddenInView = db.properties.filter((p) => !visibleProps.includes(p)).map((p) => p.id);
    reorderProperties(db.id, [...next, ...hiddenInView]);
  };

  const onRowEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = rows.map((r) => r.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    reorderRows(db.id, next);
  };

  return (
    <div ref={tableScrollRef} className="relative overflow-x-auto">
      <RowMarqueeOverlay containerRef={tableScrollRef} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onColEnd}>
        <SortableContext items={visibleProps.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
          <div className="min-w-full">
            <div className="flex border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <HeaderCheckboxGutter rowIds={rowIds} />
              {visibleProps.map((p, i) => <SortableHeader key={p.id} prop={p} db={db} view={view} index={i} writeView={writeView} />)}
              <AddColumnHeader dbId={db.id} />
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRowEnd}>
              <SortableContext items={tree.map((n) => n.row.id)} strategy={verticalListSortingStrategy}>
                {tree.map((node, rowIndex) => (
                  <SortableRow
                    key={node.row.id}
                    row={node.row}
                    rowIndex={rowIndex}
                    db={db}
                    visibleProps={visibleProps}
                    onOpen={() => onOpenRow(node.row.id)}
                    onDelete={() => deleteRow(db.id, node.row.id)}
                    autoEdit={pendingFocusId === node.row.id}
                    onAutoEditConsumed={() => setPendingFocusId(null)}
                    selectedCell={selectedCell}
                    onSelectCell={setSelectedCell}
                    fill={fill}
                    wrap={wrap}
                    rowHeightClass={rowHeightClass}
                    treeEnabled={treeEnabled}
                    depth={node.depth}
                    hasChildren={node.hasChildren}
                    expanded={
                      expanded.has(node.row.id) ||
                      (expanded.size === 0 && treeEnabled)
                    }
                    onToggleExpand={() => toggleExpand(node.row.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <AddRowFooter onAdd={async () => {
              const r = await addRow(db.id);
              setPendingFocusId(r.id);
            }} />
            <CalcFooter db={db} view={view} rows={rows} visibleProps={visibleProps} />
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
