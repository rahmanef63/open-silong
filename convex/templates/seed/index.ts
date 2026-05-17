import type { TemplateJson } from "../lib/validate";
import { notionWorkspace } from "./notionWorkspace";
import { expenseTracker } from "./expenseTracker";
import { readingList } from "./readingList";
import { habitTracker } from "./habitTracker";
import { projectOs } from "./projectOs";
import { personalCrm } from "./personalCrm";
import { contentCalendar } from "./contentCalendar";
import { okrTracker } from "./okrTracker";
import { recipeVault } from "./recipeVault";
import { dailyJournal } from "./dailyJournal";
import { meetingNotes } from "./meetingNotes";
import { sprintPlanner } from "./sprintPlanner";
import { bugTracker } from "./bugTracker";
import { roadmap } from "./roadmap";
import { tripPlanner } from "./tripPlanner";
import { budget } from "./budget";
import { investmentPortfolio } from "./investmentPortfolio";
import { courseTracker } from "./courseTracker";
import { homeInventory } from "./homeInventory";
import { workoutLog } from "./workoutLog";
import { salesPipeline } from "./salesPipeline";
import { subscriptionTracker } from "./subscriptionTracker";
import { jobSearch } from "./jobSearch";
import { weddingPlanner } from "./weddingPlanner";
import { garageWorkshop } from "./garageWorkshop";
import { podcastLibrary } from "./podcastLibrary";

/** Default seed catalog. One file per template — order shapes the gallery
 *  sort. Convex mutations evaluate this module synchronously, so imports
 *  stay static (no `import()`). To add a template: drop a new file under
 *  this folder, append the import + entry below, bump the count in
 *  seedCatalog.test.ts. */
export const SEED_TEMPLATES: TemplateJson[] = [
  // Featured — comprehensive showcase of every block/view/property type
  notionWorkspace,
  // Starter (single database)
  expenseTracker,
  readingList,
  habitTracker,
  // Productivity dashboards (multi-db, columns + dashboard view)
  projectOs,
  sprintPlanner,
  meetingNotes,
  bugTracker,
  roadmap,
  okrTracker,
  // Personal / lifestyle
  dailyJournal,
  workoutLog,
  podcastLibrary,
  recipeVault,
  // Career / business
  personalCrm,
  salesPipeline,
  jobSearch,
  contentCalendar,
  // Finance
  budget,
  investmentPortfolio,
  subscriptionTracker,
  // Home / hobby
  homeInventory,
  garageWorkshop,
  // Education / events / travel
  courseTracker,
  tripPlanner,
  weddingPlanner,
];
