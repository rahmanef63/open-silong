/** Database catalog barrel — one file per database for max modularity.
 *  Refs cross-link via relation properties:
 *    tasks.project    → projects
 *    tasks.assignee   → contacts
 *    projects.lead    → contacts
 *    events.attendees → contacts
 *  Covers every Nosion property type + every view type at least once. */

export { projectsDb } from "./projects";
export { tasksDb } from "./tasks";
export { notesDb } from "./notes";
export { eventsDb } from "./events";
export { contactsDb } from "./contacts";
export { readingDb } from "./reading";
export { locationsDb } from "./locations";
