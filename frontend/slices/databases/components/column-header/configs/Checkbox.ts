import type { PropertyTypeMenuConfig } from "../types";

/** Checkbox — no ai_autofill, no freeze (single col tends to be tiny). */
export const CheckboxConfig: PropertyTypeMenuConfig = {
  mainMenu: [
    "edit_property", "change_type",
    "filter", "sort", "group", "calculate",
    "hide", "wrap_content",
    "insert_left", "insert_right",
    "duplicate", "delete",
  ],
};
