import type { PropertyTypeMenuConfig } from "../types";

/** Files & media — no ai_autofill, no group (binary content can't aggregate). */
export const FilesConfig: PropertyTypeMenuConfig = {
  mainMenu: [
    "edit_property", "change_type",
    "filter", "sort", "calculate",
    "freeze", "hide", "wrap_content",
    "insert_left", "insert_right",
    "duplicate", "delete",
  ],
};
