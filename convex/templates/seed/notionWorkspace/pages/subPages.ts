/** Sub-pages — each is a thin shell that links one or two databases.
 *  Refs match the `pageRef` strings inside `root.ts` page-block columns. */

import type { TplPageT } from "../../../lib/validate";

export const projectsPage: TplPageT = {
  ref: "page-projects",
  title: "Projects Hub",
  icon: "🚀",
  blocks: [
    { type: "h1", text: "🚀 Projects Hub" },
    { type: "callout", text: "All projects with status, priority, lead, dates, and budget. Switch views via the view bar." },
    { type: "database", databaseRef: "projects" },
  ],
};

export const tasksPage: TplPageT = {
  ref: "page-tasks",
  title: "Tasks",
  icon: "✅",
  blocks: [
    { type: "h1", text: "✅ Tasks" },
    { type: "paragraph", text: "Filter by status, group by project, drag between kanban columns. Auto-generated TASK-N id per row." },
    { type: "database", databaseRef: "tasks" },
  ],
};

export const notesPage: TplPageT = {
  ref: "page-notes",
  title: "Notes",
  icon: "📝",
  blocks: [
    { type: "h1", text: "📝 Notes" },
    { type: "paragraph", text: "Capture any thought. Categories sort them, Starred flag pins favourites, Feed view shows latest activity." },
    { type: "database", databaseRef: "notes" },
  ],
};

export const calendarPage: TplPageT = {
  ref: "page-calendar",
  title: "Calendar",
  icon: "📅",
  blocks: [
    { type: "h1", text: "📅 Calendar" },
    { type: "callout", text: "Click a date to add an event. Timeline view shows duration; table is a flat list." },
    { type: "database", databaseRef: "events" },
  ],
};

export const contactsPage: TplPageT = {
  ref: "page-contacts",
  title: "Contacts",
  icon: "👥",
  blocks: [
    { type: "h1", text: "👥 Contacts" },
    { type: "paragraph", text: "Lightweight CRM. Tag your team, clients, vendors, and friends. Photos render in the gallery roster." },
    { type: "database", databaseRef: "contacts" },
  ],
};

export const readingPage: TplPageT = {
  ref: "page-reading",
  title: "Reading List",
  icon: "📚",
  blocks: [
    { type: "h1", text: "📚 Reading List" },
    { type: "callout", text: "Book covers in gallery, board by status, chart by genre. Rate from 1-5." },
    { type: "database", databaseRef: "reading" },
  ],
};

export const placesPage: TplPageT = {
  ref: "page-places",
  title: "Places",
  icon: "📍",
  blocks: [
    { type: "h1", text: "📍 Places" },
    { type: "paragraph", text: "Map view for visited spots, table for the full list, form view to crowdsource new entries." },
    { type: "database", databaseRef: "locations" },
  ],
};

export const allSubPages: TplPageT[] = [
  projectsPage, tasksPage, notesPage, calendarPage,
  contactsPage, readingPage, placesPage,
];
