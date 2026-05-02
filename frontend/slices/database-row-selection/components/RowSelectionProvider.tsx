import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import type { RowSelectionApi, RowSelectionState } from "../types";

const Ctx = createContext<RowSelectionApi | null>(null);

interface Props {
  rowOrder: string[];
  children: ReactNode;
}

const empty: RowSelectionState = { ids: new Set(), anchor: null };

export function RowSelectionProvider({ rowOrder, children }: Props) {
  const [state, setState] = useState<RowSelectionState>(empty);

  // Drop ids that no longer exist (row deleted, view filtered, etc.)
  useEffect(() => {
    setState((s) => {
      if (s.ids.size === 0 && s.anchor === null) return s;
      const valid = new Set(rowOrder);
      const ids = new Set([...s.ids].filter((id) => valid.has(id)));
      const anchor = s.anchor && valid.has(s.anchor) ? s.anchor : null;
      if (ids.size === s.ids.size && anchor === s.anchor) return s;
      return { ids, anchor };
    });
  }, [rowOrder]);

  const selectOne = useCallback((id: string) => {
    setState({ ids: new Set([id]), anchor: id });
  }, []);
  const toggle = useCallback((id: string) => {
    setState((s) => {
      const next = new Set(s.ids);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ids: next, anchor: id };
    });
  }, []);
  const setIds = useCallback((ids: string[]) => {
    setState((s) => ({ ids: new Set(ids), anchor: ids[ids.length - 1] ?? s.anchor }));
  }, []);
  const clear = useCallback(() => setState(empty), []);
  const isSelected = useCallback((id: string) => state.ids.has(id), [state.ids]);

  const value = useMemo<RowSelectionApi>(() => ({
    state, isSelected, selectOne, toggle, setIds, clear, count: state.ids.size,
  }), [state, isSelected, selectOne, toggle, setIds, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRowSelection(): RowSelectionApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRowSelection must be used inside RowSelectionProvider");
  return c;
}

export function useRowSelectionOptional(): RowSelectionApi | null {
  return useContext(Ctx);
}
