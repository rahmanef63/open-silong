import type { TemplateJson } from "../lib/validate";
import { expenseTracker } from "./expenseTracker";
import { readingList } from "./readingList";
import { habitTracker } from "./habitTracker";
import { projectOs } from "./projectOs";
import { personalCrm } from "./personalCrm";
import { contentCalendar } from "./contentCalendar";
import { okrTracker } from "./okrTracker";
import { recipeVault } from "./recipeVault";

/** Default seed catalog. Order shapes the gallery sort.
 *  - First three: simple single-database starters (Personal/Finance).
 *  - Last five (cycle 7, 2026-05-09): column-heavy dashboards with
 *    cross-database relations + dashboard/chart/calendar views. */
export const SEED_TEMPLATES: TemplateJson[] = [
  expenseTracker,
  readingList,
  habitTracker,
  projectOs,
  personalCrm,
  contentCalendar,
  okrTracker,
  recipeVault,
];
