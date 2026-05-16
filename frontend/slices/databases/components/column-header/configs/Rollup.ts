import type { PropertyTypeMenuConfig } from "../types";

/** Rollup — no ai_autofill (computed value), no group (aggregate output). */
export const RollupConfig: PropertyTypeMenuConfig = {
  mainMenu: [
    "edit_property", "change_type",
    "filter", "sort", "calculate",
    "freeze", "hide", "wrap_content",
    "insert_left", "insert_right",
    "duplicate", "delete",
  ],
};
