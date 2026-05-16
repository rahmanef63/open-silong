import { Database, DatabaseViewConfig, Page, Property, SelectOption } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { useMemo, useState } from "react";
import {
  DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { getVisibleProps } from "../lib/visibility";
import { QuickCreateDialog } from "../components/QuickCreateDialog";
import type { PropertyValue } from "@/shared/types/domain";
import { BoardColumn } from "./board/BoardColumn";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function BoardView({ db, view, rows, onOpenRow }: Props) {
  const { setRowValue, updateView } = useStore();
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
  const viewVisible = getVisibleProps(db, view);

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

    if (activeId.startsWith("colsort_") && overId.startsWith("colsort_")) {
      if (activeId === overId) return;
      const fromKey = activeId.slice("colsort_".length);
      const toKey = overId.slice("colsort_".length);
      const fromIdx = sortableIds.indexOf(activeId);
      const toIdx = sortableIds.indexOf(overId);
      if (fromIdx === -1 || toIdx === -1) return;
      if (fromKey === "null" || toKey === "null") return;
      const next = sortedOptions.map((o) => o.id);
      next.splice(toIdx, 0, next.splice(fromIdx, 1)[0]);
      updateView(db.id, view.id, { boardColumnOrder: next });
      return;
    }

    // Dropping a card onto a column → cross-column move (common case).
    // Dropping a card onto another CARD → look up which column owns the
    // target card and treat as a drop into that column. Without this
    // fallback, the user can drag halfway across the board and have
    // nothing happen because the cursor landed on a sibling card —
    // silent UX failure flagged in the 2026-05-16 DnD audit.
    let colId: string | null;
    if (overId.startsWith("col_")) {
      const raw = overId.slice(4);
      colId = raw === "null" ? null : raw;
    } else {
      const targetCol = columns.find((c) => c.rows.some((r) => r.id === overId));
      if (!targetCol) return;
      colId = targetCol.id;
    }
    const currentColId = (rows.find((r) => r.id === activeId)?.rowProps?.[groupProp.id] as string | null | undefined) ?? null;
    if (currentColId === colId) return; // already in target column — no-op
    setRowValue(db.id, activeId, groupProp.id, colId);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
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
