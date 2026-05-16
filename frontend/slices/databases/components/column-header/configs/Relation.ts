import type { PropertyTypeMenuConfig } from "../types";

/** Relation — no duplicate (cloning a relation would split the
 *  inverse-prop linkage; cleaner to make a fresh relation). */
export const RelationConfig: PropertyTypeMenuConfig = {
  mainMenu: [
    "edit_property", "change_type", "ai_autofill",
    "filter", "sort", "group", "calculate",
    "freeze", "hide", "wrap_content",
    "insert_left", "insert_right",
    "delete",
  ],
};
