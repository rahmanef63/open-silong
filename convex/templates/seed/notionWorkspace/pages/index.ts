/** Page-tree barrel — assembles root + 7 sub-pages into the shape
 *  TemplateJson expects (single root with `children`). */

import type { TplPageT } from "../../../lib/validate";
import { rootPage } from "./root";
import { allSubPages } from "./subPages";
import {
  projectsDb, tasksDb, notesDb, eventsDb,
  contactsDb, readingDb, locationsDb,
} from "../databases";
import {
  projectsSeed, tasksSeed, notesSeed, eventsSeed,
  contactsSeed, readingSeed, locationsSeed,
} from "../seedRows";

/** Stitches databases + seedRows onto the root page (template SSOT
 *  expects all `TplDatabase`s declared on the page that hosts them).
 *  Each database is attached with its seedRows assembled inline so the
 *  validator sees a single immutable tree. */
export const composedRoot: TplPageT = {
  ...rootPage,
  databases: [
    { ...projectsDb, seedRows: projectsSeed },
    { ...tasksDb, seedRows: tasksSeed },
    { ...notesDb, seedRows: notesSeed },
    { ...eventsDb, seedRows: eventsSeed },
    { ...contactsDb, seedRows: contactsSeed },
    { ...readingDb, seedRows: readingSeed },
    { ...locationsDb, seedRows: locationsSeed },
  ],
  children: allSubPages,
};
