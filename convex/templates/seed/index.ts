import type { TemplateJson } from "../lib/validate";
import { expenseTracker } from "./expenseTracker";
import { readingList } from "./readingList";
import { habitTracker } from "./habitTracker";

export const SEED_TEMPLATES: TemplateJson[] = [expenseTracker, readingList, habitTracker];
