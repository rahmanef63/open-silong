import type { PropertyTypeMenuConfig } from "../types";

/** Formula — minimal menu per Notion: Edit property + Edit formula.
 *  Formula values are computed so the usual filter/sort/calculate
 *  surface still applies; included for parity with other computed
 *  types. The user spec lists only the two edit items — keep that
 *  minimal mode but append the structural items so columns stay
 *  reorderable / deletable. */
export const FormulaConfig: PropertyTypeMenuConfig = {
  mainMenu: [
    "edit_property", "edit_formula",
    "filter", "sort", "calculate",
    "freeze", "hide", "wrap_content",
    "insert_left", "insert_right",
    "duplicate", "delete",
  ],
};
