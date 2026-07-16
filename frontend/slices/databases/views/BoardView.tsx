import { Database, DatabaseViewConfig, Page, Property, SelectOption } from "@/shared/types/domain";
import { useDbAdapter } from "../lib/useDbAdapter";
import { useCallback, useMemo, useState } from "react";
import {
  DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, KeyboardSensor,
  pointerWithin, rectIntersection, type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { getVisibleProps } from "../lib/visibility";
import { QuickCreateDialog } from "../components/QuickCreateDialog";
import type { PropertyValue } from "@/shared/types/domain";
import { BoardColumn } from "./board/BoardColumn";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

const COL_PREFIX = "col_";
const COLSORT_PREFIX = "colsort_";

/** Resolve any over-id (col_*, colsort_*, or a row id) to a column id
 *  (or null for the "no group" column, or undefined when not found). */
function resolveOverColId(
  overId: string,
  columns: { id: string | null; rows: Page[] }[],
): string | null | undefined {
  if (overId.startsWith(COL_PREFIX)) {
    const raw = overId.slice(COL_PREFIX.length);
    return raw === "null" ? null : raw;
  }
  if (overId.startsWith(COLSORT_PREFIX)) {
    const raw = overId.slice(COLSORT_PREFIX.length);
    return raw === "null" ? null : raw;
  }
  // Row id → owning column
  const owner = columns.find((c) => c.rows.some((r) => r.id === overId));
  return owner?.id;
}

export function BoardView({ db, view, rows, onOpenRow }: Props) {
  const { setRowValue, updateView } = useDbAdapter();
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickPrefill, setQuickPrefill] = useState<Record<string, PropertyValue>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const groupProp: Property | undefined = useMemo(() => {
    return db.properties.find((p) => p.id === view.groupBy)
      ?? db.properties.find((p) => p.type === "status" || p.type === "select");
  }, [db.properties, view.groupBy]);

  /** Disambiguates the two droppables registered on the same column ref
   *  (`col_*` from useDroppable AND `colsort_*` from useSortable).
   *  Without this, the default detector returns either at random — card
   *  drops sometimes hit `colsort_*` which the cross-column branch
   *  ignored, silently breaking the move. Strategy:
   *    - Column-reorder drags (active = colsort_*): only colsort_*
   *      targets count.
   *    - Card drags (active = anything else): prefer `col_*`; fall
   *      back to colsort_* only when nothing else under cursor.
   *      `resolveOverColId` handles either prefix.
   *  Declared BEFORE the early return so the hook ordering is stable. */
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const activeId = String(args.active.id);
    const pointer = pointerWithin(args);
    const rect = rectIntersection(args);
    const collisions = pointer.length > 0 ? pointer : rect;
    if (activeId.startsWith(COLSORT_PREFIX)) {
      return collisions.filter((c) => String(c.id).startsWith(COLSORT_PREFIX));
    }
    const colDirect = collisions.filter((c) => String(c.id).startsWith(COL_PREFIX));
    if (colDirect.length > 0) return colDirect;
    return collisions;
  }, []);

  if (!groupProp || !groupProp.options) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Board view needs a Select or Status property. Add one from the
        column header → Change type, or via the Properties menu in the
        view toolbar.
      </div>
    );
  }

  const colorByProp = view.boardColorByProp
    ? db.properties.find((p) => p.id === view.boardColorByProp)
    : undefined;
  const cardSize = view.boardCardSize ?? "medium";
  const cardPadding = cardSize === "small" ? "p-2" : cardSize === "large" ? "p-4" : "p-3";
  const cardSpacing = cardSize === "small" ? "space-y-1.5" : cardSize === "large" ? "space-y-3" : "space-y-2";
  const cardPropIds = view.boardCardProps;
  const viewVisible = useMemo(() => getVisibleProps(db, view), [db, view]);

  // Apply persisted column order (boardColumnOrder) — unknown ids fall to
  // the end in their original order. Cheap O(n) — board columns rarely > 20.
  const orderIdx = new Map<string, number>(
    (view.boardColumnOrder ?? []).map((id, i) => [id, i]),
  );
  const sortedOptions = [...groupProp.options].sort((a, b) => {
    const ai = orderIdx.has(a.id) ? orderIdx.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const bi = orderIdx.has(b.id) ? orderIdx.get(b.id)! : Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });

  let columns: { id: string | null; option?: SelectOption; rows: Page[] }[] = [
    ...sortedOptions.map((o) => ({
      id: o.id, option: o,
      rows: rows.filter((r) => r.rowProps?.[groupProp.id] === o.id),
    })),
    { id: null, rows: rows.filter((r) => !r.rowProps?.[groupProp.id]) },
  ];
  if (view.boardHideEmptyGroups) {
    columns = columns.filter((c) => c.rows.length > 0);
  }

  const sortableIds = columns.map((c) => `colsort_${c.id ?? "null"}`);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // Column reorder
    if (activeId.startsWith(COLSORT_PREFIX)) {
      if (!overId.startsWith(COLSORT_PREFIX) || activeId === overId) return;
      const fromKey = activeId.slice(COLSORT_PREFIX.length);
      const toKey = overId.slice(COLSORT_PREFIX.length);
      if (fromKey === "null" || toKey === "null") return;
      const fromIdx = sortableIds.indexOf(activeId);
      const toIdx = sortableIds.indexOf(overId);
      if (fromIdx === -1 || toIdx === -1) return;
      const next = sortedOptions.map((o) => o.id);
      next.splice(toIdx, 0, next.splice(fromIdx, 1)[0]);
      updateView(db.id, view.id, { boardColumnOrder: next });
      return;
    }

    // Card move — resolve any over-id (col_*, colsort_*, or a row id)
    // to a column id, then update the grouping property.
    const colId = resolveOverColId(overId, columns);
    if (colId === undefined) return;
    const currentColId = (rows.find((r) => r.id === activeId)?.rowProps?.[groupProp.id] as string | null | undefined) ?? null;
    if (currentColId === colId) return;
    setRowValue(db.id, activeId, groupProp.id, colId);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd} collisionDetection={collisionDetection}>
      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
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
          {columns.map((col) => (
            <BoardColumn key={col.id ?? "none"} db={db} col={col} groupProp={groupProp}
              cardPadding={cardPadding} cardSpacing={cardSpacing}
              colorByProp={colorByProp} cardPropIds={cardPropIds}
              viewVisible={viewVisible}
              onAdd={() => {
                setQuickPrefill({ [groupProp.id]: col.id ?? null });
                setQuickOpen(true);
              }}
              onOpen={onOpenRow}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
