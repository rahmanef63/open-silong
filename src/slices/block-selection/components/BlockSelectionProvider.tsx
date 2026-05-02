import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import type { SelectionApi, SelectionState } from "../types";
import {
  emptySelection, selectSingle, toggleSelection, rangeSelect, clearSelection, pruneToOrder,
} from "../lib/selectionState";

const Ctx = createContext<SelectionApi | null>(null);

interface Props {
  blockOrder: string[];
  children: ReactNode;
}

export function BlockSelectionProvider({ blockOrder, children }: Props) {
  const [state, setState] = useState<SelectionState>(emptySelection);
  const orderRef = useRef(blockOrder);
  orderRef.current = blockOrder;

  // Drop selection entries for blocks that no longer exist.
  useEffect(() => {
    setState((s) => pruneToOrder(s, blockOrder));
  }, [blockOrder]);

  const selectOne = useCallback((id: string) => setState(() => selectSingle(id)), []);
  const toggle = useCallback((id: string) => setState((s) => toggleSelection(s, id)), []);
  const range = useCallback((id: string) => setState((s) => rangeSelect(s, id, orderRef.current)), []);
  const setIds = useCallback((ids: string[]) => {
    setState((s) => ({ ids: new Set(ids), anchor: ids[ids.length - 1] ?? s.anchor }));
  }, []);
  const clear = useCallback(() => setState(clearSelection), []);
  const isSelected = useCallback((id: string) => state.ids.has(id), [state.ids]);

  // Native document-level capture listener:
  // Runs BEFORE any React handler (and before Radix DropdownMenuTrigger / dnd-kit
  // listeners on the same grip button). When the user holds a modifier and clicks
  // a grip, we intercept the pointerdown, fire the selection op, and call
  // stopImmediatePropagation + preventDefault so the dropdown doesn't open and
  // dnd-kit doesn't start a drag.
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const grip = target.closest<HTMLElement>("[data-block-grip]");
      if (!grip) return;
      const wantSelect = e.shiftKey || e.metaKey || e.ctrlKey;
      if (!wantSelect) return;
      const shell = grip.closest<HTMLElement>("[data-block-shell-id]");
      const id = shell?.dataset.blockShellId;
      if (!id) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.shiftKey) setState((s) => rangeSelect(s, id, orderRef.current));
      else setState((s) => toggleSelection(s, id));
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, []);

  const value = useMemo<SelectionApi>(() => ({
    state, isSelected, selectOne, toggle, range, setIds, clear, count: state.ids.size,
  }), [state, isSelected, selectOne, toggle, range, setIds, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBlockSelection(): SelectionApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBlockSelection must be used inside BlockSelectionProvider");
  return c;
}

// Safe variant for components that may render outside a provider (e.g. NestedBlock when
// used in DragOverlay or detached previews).
export function useBlockSelectionOptional(): SelectionApi | null {
  return useContext(Ctx);
}
