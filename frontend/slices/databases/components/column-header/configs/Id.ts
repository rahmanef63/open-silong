import type { PropertyTypeMenuConfig } from "../types";

/** Unique ID — no change_type / ai_autofill / group / duplicate (ids
 *  are auto-stamped; cloning would create overlapping sequences). */
export const IdConfig: PropertyTypeMenuConfig = {
  mainMenu: [
    "edit_property",
    "filter", "sort", "calculate",
    "freeze", "hide", "wrap_content",
    "insert_left", "insert_right",
    "delete",
  ],
};
