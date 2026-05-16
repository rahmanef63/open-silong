import type { PropertyTypeMenuConfig } from "../types";

/** Fallback config for types not in the user-supplied spec
 *  (verification, ai_summary, ai_translation, ai_keywords, ai_custom).
 *  Mirrors the Text layout so the menu still surfaces every
 *  structural action. */
export const DefaultConfig: PropertyTypeMenuConfig = {
  mainMenu: [
    "edit_property", "change_type",
    "filter", "sort", "calculate",
    "freeze", "hide", "wrap_content",
    "insert_left", "insert_right",
    "duplicate", "delete",
  ],
};
