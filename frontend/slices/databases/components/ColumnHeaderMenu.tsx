import { Fragment } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/shared/ui/dropdown-menu";
import type { Database, DatabaseViewConfig, Property } from "@/shared/types/domain";
import { useColumnHeaderActions } from "./column-header/useColumnHeaderActions";
import { renderMenuItem } from "./column-header/items";
import { PROPERTY_TYPE_MENU_CONFIG, sectionOf } from "./column-header/configs";

interface Props {
  db: Database;
  view: DatabaseViewConfig;
  prop: Property;
  index: number;
  trigger: React.ReactNode;
  /** Per-block view writer. When provided, filter/sort/hidden/calc
   *  edits route through here so linked-view blocks get independent
   *  state. Falls back to direct db write. */
  writeView?: (viewId: string, patch: Partial<DatabaseViewConfig>) => void;
}

/** Notion-style column header menu.
 *
 *  Renders entirely from `PROPERTY_TYPE_MENU_CONFIG[prop.type].mainMenu`
 *  — no per-type switch, no hardcoded item order. Adding a column
 *  variant is a one-file change in `column-header/configs/`. Adding
 *  an item is a one-renderer + one-key change in `column-header/items/`. */
export function ColumnHeaderMenu({ db, view, prop, index, trigger, writeView }: Props) {
  const { actions, flags } = useColumnHeaderActions({ db, view, prop, index, writeView });
  const config = PROPERTY_TYPE_MENU_CONFIG[prop.type];
  const items = config?.mainMenu ?? [];
  const ctx = { db, view, prop, index, actions, flags };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {items.map((key, i) => {
          const prev = items[i - 1];
          const needsSeparator = prev !== undefined && sectionOf(prev) !== sectionOf(key);
          return (
            <Fragment key={key}>
              {needsSeparator && <DropdownMenuSeparator />}
              {renderMenuItem(key, ctx)}
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
