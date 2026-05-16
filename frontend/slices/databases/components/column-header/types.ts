/** Column-header menu type contracts.
 *
 *  Each PropertyType declares which menu items appear (and in what
 *  order) via `PROPERTY_TYPE_MENU_CONFIG` (`./configs/index.ts`).
 *  Each menu item key resolves to a component via `MENU_ITEM_REGISTRY`
 *  (`./items/index.ts`). The item component receives a uniform
 *  `MenuItemContext` so handlers stay decoupled from the parent menu.
 *
 *  Adding a new item:
 *    1. Pick a `MenuItemKey` (extend the union here).
 *    2. Build the component in `./items/<Key>Item.tsx`.
 *    3. Register it in `./items/index.ts`.
 *    4. Reference it from any type's `mainMenu` in `./configs/<Type>.ts`.
 */

import type { ReactElement } from "react";
import type {
  CalcKind, Database, DatabaseViewConfig, Property, PropertyType,
} from "@/shared/types/domain";

/** Every supported main-menu item. Keep in sync with `MENU_ITEM_REGISTRY`. */
export type MenuItemKey =
  | "edit_property"
  | "edit_automation"
  | "edit_formula"
  | "change_type"
  | "ai_autofill"
  | "filter"
  | "sort"
  | "group"
  | "calculate"
  | "freeze"
  | "hide"
  | "wrap_content"
  | "display_as"
  | "show_full_url"
  | "insert_left"
  | "insert_right"
  | "move_left"
  | "move_right"
  | "duplicate"
  | "delete";

/** Action dispatcher returned by `useColumnHeaderActions`. */
export interface ColumnHeaderActions {
  seedFilter: () => void;
  setSort: (next: DatabaseViewConfig["sorts"]) => void;
  groupBy: () => void;
  setCalc: (c: CalcKind) => void;
  toggleFreeze: () => void;
  toggleHide: () => void;
  toggleWrap: () => void;
  insertAt: (offset: -1 | 1) => void;
  moveBy: (offset: -1 | 1) => void;
  duplicate: () => void;
  remove: () => void;
  changeType: (t: PropertyType) => void;
  toggleShowFullUrl: () => void;
}

/** Computed flags used by items to render checks / badges / disabled state. */
export interface ColumnHeaderFlags {
  locked: boolean;
  viewLocked: boolean;
  isFrozen: boolean;
  isHidden: boolean;
  isWrap: boolean;
  filtered: boolean;
  grouped: boolean;
  currentCalc: CalcKind;
  calcs: CalcKind[];
  canMoveLeft: boolean;
  canMoveRight: boolean;
  isShowFullUrl: boolean;
}

/** Uniform render context handed to every menu-item component. */
export interface MenuItemContext {
  db: Database;
  view: DatabaseViewConfig;
  prop: Property;
  index: number;
  actions: ColumnHeaderActions;
  flags: ColumnHeaderFlags;
}

export type MenuItemRenderer = (ctx: MenuItemContext) => ReactElement | null;

/** Per-PropertyType menu wiring. `mainMenu` is the ordered list of
 *  items to render in the dropdown. Separator placement is automatic
 *  via `MENU_SECTIONS` in `./configs/index.ts`. */
export interface PropertyTypeMenuConfig {
  mainMenu: MenuItemKey[];
}
