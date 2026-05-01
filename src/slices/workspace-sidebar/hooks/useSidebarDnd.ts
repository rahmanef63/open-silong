import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter, KeyboardSensor, PointerSensor,
  type DragEndEvent, type DragMoveEvent, type DragStartEvent, type Modifier,
  useSensor, useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
import { toast } from "sonner";
import type { Page } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import type { TreeItem } from "../lib/keyboard";

const NEST_THRESHOLD_PX = 28;
const NEST_HINT_MAX_PX = 40;

const clampHorizontal: Modifier = ({ transform }) => ({
  ...transform,
  x: Math.max(0, Math.min(NEST_HINT_MAX_PX, transform.x)),
});

interface Args {
  treeItems: TreeItem[];
  pageMap: Map<string, Page>;
  itemById: Map<string, TreeItem>;
  setPageOpen: (id: string, open: boolean) => void;
}

export function useSidebarDnd({ treeItems, pageMap, itemById, setPageOpen }: Args) {
  const { childrenOf, reorderPages, movePage } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [nestIntent, setNestIntent] = useState(false);
  const [externalOverId, setExternalOverId] = useState<string | null>(null);
  const dragStartXRef = useRef(0);
  const nestIntentRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isDescendantOf = useCallback((possibleChildId: string, parentId: string) => {
    let current = pageMap.get(possibleChildId);
    while (current?.parentId) {
      if (current.parentId === parentId) return true;
      current = pageMap.get(current.parentId);
    }
    return false;
  }, [pageMap]);

  const resetDrag = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setNestIntent(false);
    nestIntentRef.current = false;
  }, []);

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    const ae = event.activatorEvent;
    if (ae instanceof PointerEvent || ae instanceof MouseEvent) {
      dragStartXRef.current = ae.clientX;
    }
  };

  const onDragMove = (event: DragMoveEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  };

  useEffect(() => {
    if (!activeId) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStartXRef.current;
      const next = dx > NEST_THRESHOLD_PX;
      nestIntentRef.current = next;
      setNestIntent((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [activeId]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const wantsNest = nestIntentRef.current;
    resetDrag();
    if (!over || active.id === over.id) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const overItem = itemById.get(overIdStr);
    if (!overItem || isDescendantOf(overIdStr, activeIdStr)) return;

    if (wantsNest) {
      const childIds = childrenOf(overIdStr).map((p) => p.id).filter((id) => id !== activeIdStr);
      reorderPages(overIdStr, [...childIds, activeIdStr]);
      setPageOpen(overIdStr, true);
      return;
    }

    const targetParentId = overItem.parentId;
    const siblingIds = childrenOf(targetParentId).map((p) => p.id).filter((id) => id !== activeIdStr);
    const overIndex = siblingIds.indexOf(overIdStr);
    const next = [...siblingIds];
    next.splice(overIndex === -1 ? next.length : overIndex, 0, activeIdStr);
    reorderPages(targetParentId, next);
    if (targetParentId) setPageOpen(targetParentId, true);
  };

  const handleNativeDropOnPage = (targetPageId: string | null, e: React.DragEvent) => {
    setExternalOverId(null);
    const droppedId = e.dataTransfer.getData("application/x-page-id");
    if (!droppedId) return;
    if (droppedId === targetPageId) return;
    if (targetPageId && isDescendantOf(targetPageId, droppedId)) {
      toast.error("Can't move a page into its own descendant");
      return;
    }
    e.preventDefault();
    movePage(droppedId, targetPageId);
    if (targetPageId) setPageOpen(targetPageId, true);
    toast.success("Page moved");
  };

  const activeDraggedItem = useMemo(
    () => (activeId ? itemById.get(activeId) ?? null : null),
    [activeId, itemById],
  );

  return {
    sensors,
    modifiers: [clampHorizontal, restrictToFirstScrollableAncestor],
    collisionDetection: closestCenter,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel: resetDrag,
    activeId,
    overId,
    nestIntent,
    externalOverId,
    setExternalOverId,
    handleNativeDropOnPage,
    activeDraggedItem,
    treeIds: treeItems.map((i) => i.page.id),
  };
}
