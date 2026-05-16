import type { PropertyType } from "@/shared/types/domain";
import { OPTION_COLORS } from "@/shared/lib/format";

export { uid } from "@/shared/lib/uid";

/** CSV-mapping colors include a `default` sentinel meaning "don't write
 *  a color on the option" — distinct from the runtime `OPTION_COLORS`
 *  list which is the actual color choices. Order matters: caller cycles
 *  via `[idx % CSV_MAPPING_COLORS.length]`. */
export const CSV_MAPPING_COLORS = ["default", ...OPTION_COLORS] as const;

export const SKIP = "__skip__";
export const TITLE = "__title__";
export const NEW_PREFIX = "__new:";

/** Types that can be created fresh from a CSV column. Excludes computed
 *  fields (rollup, formula, created_time, created_by, last_edited_time,
 *  last_edited_by, unique_id) and types whose values can't come from raw
 *  CSV strings (person, files — those need real ids). */
export const NEW_TYPES: PropertyType[] = [
  "text", "number", "select", "multi_select", "status", "date",
  "checkbox", "url", "email", "phone", "relation",
];

export const COMPUTED_TYPES: PropertyType[] = [
  "rollup", "formula", "created_time", "created_by",
  "last_edited_time", "last_edited_by", "unique_id",
];
