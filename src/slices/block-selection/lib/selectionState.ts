import type { SelectionState } from "../types";

export const emptySelection: SelectionState = { ids: new Set(), anchor: null };

export function selectSingle(id: string): SelectionState {
  return { ids: new Set([id]), anchor: id };
}

export function toggleSelection(state: SelectionState, id: string): SelectionState {
  const next = new Set(state.ids);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return { ids: next, anchor: id };
}

export function rangeSelect(
  state: SelectionState,
  id: string,
  order: readonly string[],
): SelectionState {
  if (!state.anchor) return selectSingle(id);
  const a = order.indexOf(state.anchor);
  const b = order.indexOf(id);
  if (a < 0 || b < 0) return selectSingle(id);
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return { ids: new Set(order.slice(lo, hi + 1)), anchor: state.anchor };
}

export function clearSelection(): SelectionState {
  return { ids: new Set(), anchor: null };
}

export function pruneToOrder(state: SelectionState, order: readonly string[]): SelectionState {
  if (state.ids.size === 0 && state.anchor === null) return state;
  const valid = new Set(order);
  const ids = new Set([...state.ids].filter((id) => valid.has(id)));
  const anchor = state.anchor && valid.has(state.anchor) ? state.anchor : null;
  if (ids.size === state.ids.size && anchor === state.anchor) return state;
  return { ids, anchor };
}
