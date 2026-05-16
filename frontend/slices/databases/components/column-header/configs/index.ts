/** Per-PropertyType column-header menu configs.
 *
 *  Each file in this folder declares the menu wiring for ONE
 *  PropertyType. The shape (`PropertyTypeMenuConfig`) lists `mainMenu`
 *  in render order; the ColumnHeaderMenu renders one component per
 *  key via `MENU_ITEM_REGISTRY`.
 *
 *  Separator placement is automatic via `MENU_SECTIONS` — items in
 *  different sections get a `<DropdownMenuSeparator>` between them.
 *
 *  Adding a new property type? Drop `./<Type>.ts` exporting a
 *  `PropertyTypeMenuConfig`, then map it here. */

import type { PropertyType } from "@/shared/types/domain";
import type { MenuItemKey, PropertyTypeMenuConfig } from "../types";

import { TextConfig } from "./Text";
import { NumberConfig } from "./Number";
import { SelectConfig } from "./Select";
import { MultiSelectConfig } from "./MultiSelect";
import { StatusConfig } from "./Status";
import { DateConfig } from "./Date";
import { PersonConfig } from "./Person";
import { FilesConfig } from "./Files";
import { CheckboxConfig } from "./Checkbox";
import { UrlConfig } from "./Url";
import { EmailConfig } from "./Email";
import { PhoneConfig } from "./Phone";
import { RelationConfig } from "./Relation";
import { RollupConfig } from "./Rollup";
import { FormulaConfig } from "./Formula";
import { ButtonConfig } from "./Button";
import { CreatedTimeConfig } from "./CreatedTime";
import { CreatedByConfig } from "./CreatedBy";
import { LastEditedTimeConfig } from "./LastEditedTime";
import { LastEditedByConfig } from "./LastEditedBy";
import { IdConfig } from "./Id";
import { PlaceConfig } from "./Place";
import { DefaultConfig } from "./Default";

export const PROPERTY_TYPE_MENU_CONFIG: Record<PropertyType, PropertyTypeMenuConfig> = {
  text: TextConfig,
  number: NumberConfig,
  select: SelectConfig,
  multi_select: MultiSelectConfig,
  status: StatusConfig,
  date: DateConfig,
  person: PersonConfig,
  files: FilesConfig,
  checkbox: CheckboxConfig,
  url: UrlConfig,
  email: EmailConfig,
  phone: PhoneConfig,
  relation: RelationConfig,
  rollup: RollupConfig,
  formula: FormulaConfig,
  button: ButtonConfig,
  created_time: CreatedTimeConfig,
  created_by: CreatedByConfig,
  last_edited_time: LastEditedTimeConfig,
  last_edited_by: LastEditedByConfig,
  unique_id: IdConfig,
  place: PlaceConfig,
  // AI variants + verification fall back to the default text-like layout.
  verification: DefaultConfig,
  ai_summary: DefaultConfig,
  ai_translation: DefaultConfig,
  ai_keywords: DefaultConfig,
  ai_custom: DefaultConfig,
};

/** Logical sections — separator inserted whenever the section changes
 *  between consecutive items. Keep ordering aligned with the per-type
 *  configs so the dividers land where Notion places them. */
const SECTION_OF: Record<MenuItemKey, number> = {
  edit_property: 0,
  edit_automation: 0,
  edit_formula: 0,
  change_type: 0,
  ai_autofill: 0,
  filter: 1,
  sort: 1,
  group: 1,
  calculate: 1,
  freeze: 2,
  hide: 2,
  wrap_content: 2,
  display_as: 2,
  show_full_url: 2,
  duplicate: 3,
  insert_left: 4,
  insert_right: 4,
  move_left: 4,
  move_right: 4,
  delete: 5,
};

export function sectionOf(key: MenuItemKey): number {
  return SECTION_OF[key] ?? 0;
}
