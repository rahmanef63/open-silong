/** Notion Workspace — comprehensive seed template.
 *
 *  Demonstrates every Nosion building block in one place:
 *    - 7 databases (projects, tasks, notes, events, contacts, reading, locations)
 *    - All 25 block types (paragraph/h1-4/todo/bullet/numbered/quote/code/
 *      divider/callout/page/database/columns2-5/toggle/image/equation/table/
 *      embed/button/synced/toc/audio/video)
 *    - All 11 view types (table/board/list/gallery/calendar/timeline/chart/
 *      dashboard/feed/map/form)
 *    - Cross-references: tasks.project → projects, tasks.assignee → contacts,
 *      projects.lead → contacts, events.attendees → contacts
 *
 *  Modular split per file (every file ≤200 LOC per project rule):
 *    databases/ — one file per database
 *    seedRows.ts — sample data, keyed by property.id
 *    pages/root.ts — landing dashboard exercising every block type
 *    pages/subPages.ts — 7 sub-pages, one per database
 *    pages/index.ts — stitches databases + seedRows onto root.
 */

import type { TemplateJson } from "../../lib/validate";
import { composedRoot } from "./pages";

export const notionWorkspace: TemplateJson = {
  version: 1,
  name: "Notion Workspace",
  icon: "🪐",
  category: "Featured",
  description:
    "A complete Notion-style workspace — 7 databases, every view type, every block type. Use it as a starting layout for any new project.",
  page: composedRoot,
};
