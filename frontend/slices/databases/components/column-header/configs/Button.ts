import type { PropertyTypeMenuConfig } from "../types";

/** Button — edit_automation replaces edit_property; no filter/sort/group
 *  (the cell is a trigger, not a value). */
export const ButtonConfig: PropertyTypeMenuConfig = {
  mainMenu: [
    "edit_automation", "change_type",
    "freeze", "hide", "wrap_content",
    "insert_left", "insert_right",
    "duplicate", "delete",
  ],
};
