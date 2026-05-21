/** Central dispatch for every column-header menu action.
 *
 *  Lifts the imperative logic out of `ColumnHeaderMenu.tsx` so each
 *  menu-item component can call a stable, well-named handler. Items
 *  stay declarative; this hook is the only place that talks to the
 *  store + view writer. */

import { useDbAdapter } from "../../lib/useDbAdapter";
import type {
  CalcKind, Database, DatabaseViewConfig, Property, PropertyType,
} from "@/shared/types/domain";
import { validCalcs } from "../../lib/calcAggregate";
import { inferFilterOp } from "./helpers";
import type { ColumnHeaderActions, ColumnHeaderFlags } from "./types";

interface Args {
  db: Database;
  view: DatabaseViewConfig;
  prop: Property;
  index: number;
  /** Per-block view writer. When provided, filter/sort/hidden/calc
   *  edits route through here so linked-view blocks get independent
   *  state. Falls back to direct db write. */
  writeView?: (viewId: string, patch: Partial<DatabaseViewConfig>) => void;
}

export function useColumnHeaderActions({ db, view, prop, index, writeView }: Args): {
  actions: ColumnHeaderActions;
  flags: ColumnHeaderFlags;
} {
  const {
    updateProperty, deleteProperty, duplicateProperty, addProperty,
    reorderProperties, updateView,
  } = useDbAdapter();

  const writeViewLocal = (patch: Partial<DatabaseViewConfig>) => {
    if (writeView) writeView(view.id, patch);
    else updateView(db.id, view.id, patch);
  };

  const flags: ColumnHeaderFlags = {
    locked: !!db.locked,
    viewLocked: !!view.locked,
    isFrozen: view.frozenPropIds?.includes(prop.id) ?? false,
    isHidden: view.hiddenPropIds?.includes(prop.id) ?? false,
    isWrap: !!view.tableWrapCells,
    filtered: view.filters.some((f) => f.propertyId === prop.id),
    grouped: view.groupBy === prop.id,
    currentCalc: (view.tableCalcs?.[prop.id] ?? "none") as CalcKind,
    calcs: validCalcs(prop),
    canMoveLeft: index > 0,
    canMoveRight: index < db.properties.length - 1,
    isShowFullUrl: !!prop.urlShowFull,
  };

  const togglePropIdInList = (key: "frozenPropIds" | "hiddenPropIds") => {
    const list = view[key] ?? [];
    const next = list.includes(prop.id)
      ? list.filter((id) => id !== prop.id)
      : [...list, prop.id];
    writeViewLocal({ [key]: next });
  };

  const actions: ColumnHeaderActions = {
    seedFilter: () => {
      const op = inferFilterOp(prop.type);
      writeViewLocal({
        filters: [...view.filters, { propertyId: prop.id, op, value: "" }],
      });
    },
    setSort: (next) => writeViewLocal({ sorts: next }),
    groupBy: () => {
      if (prop.type !== "select" && prop.type !== "status") return;
      // type change is structural — keep on db; groupBy is per-block.
      updateView(db.id, view.id, { type: "board" });
      writeViewLocal({ groupBy: prop.id });
    },
    setCalc: (c) => {
      const calcs = { ...(view.tableCalcs ?? {}) };
      if (c === "none") delete calcs[prop.id];
      else calcs[prop.id] = c;
      writeViewLocal({ tableCalcs: calcs });
    },
    toggleFreeze: () => togglePropIdInList("frozenPropIds"),
    toggleHide: () => togglePropIdInList("hiddenPropIds"),
    toggleWrap: () => updateView(db.id, view.id, { tableWrapCells: !flags.isWrap }),
    insertAt: async (offset) => {
      const newProp = await addProperty(db.id, "text");
      const all = [...db.properties.map((p) => p.id)];
      const allWithout = all.filter((id) => id !== newProp.id);
      const target = Math.max(0, Math.min(allWithout.length, index + (offset === 1 ? 1 : 0)));
      const next = [...allWithout.slice(0, target), newProp.id, ...allWithout.slice(target)];
      reorderProperties(db.id, next);
    },
    moveBy: (offset) => {
      const ids = db.properties.map((p) => p.id);
      const target = index + offset;
      if (target < 0 || target >= ids.length) return;
      const next = [...ids];
      [next[index], next[target]] = [next[target], next[index]];
      reorderProperties(db.id, next);
    },
    duplicate: () => { duplicateProperty(db.id, prop.id); },
    remove: () => { deleteProperty(db.id, prop.id); },
    changeType: (t: PropertyType) => { updateProperty(db.id, prop.id, { type: t }); },
    toggleShowFullUrl: () => { updateProperty(db.id, prop.id, { urlShowFull: !flags.isShowFullUrl }); },
  };

  return { actions, flags };
}
