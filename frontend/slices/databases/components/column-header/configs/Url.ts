import type { PropertyTypeMenuConfig } from "../types";

/** URL — first item is the "Show full URL" toggle (no Edit-property
 *  submenu since the only setting is that toggle). */
export const UrlConfig: PropertyTypeMenuConfig = {
  mainMenu: [
    "show_full_url", "change_type", "ai_autofill",
    "filter", "sort", "group", "calculate",
    "freeze", "hide", "wrap_content",
    "insert_left", "insert_right",
    "duplicate", "delete",
  ],
};
