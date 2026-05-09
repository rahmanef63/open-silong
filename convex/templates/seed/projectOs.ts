import type { TemplateJson } from "../lib/validate";

/** Project OS — productivity dashboard.
 *
 *  Maximizes columns: columns3 KPI strip on top, columns2 below
 *  pairing the projects table with the tasks board. Tasks db has
 *  five views including a dashboard with KPIs + breakdowns.
 *
 *  Two databases linked via relation: projects ←→ tasks. */
export const projectOs: TemplateJson = {
  version: 1,
  name: "Project OS",
  icon: "🚀",
  category: "Productivity",
  description: "Project + task tracker w/ KPI dashboard, kanban board, and sprint calendar.",
  page: {
    ref: "root",
    title: "Project OS",
    icon: "🚀",
    blocks: [
      { type: "h1", text: "🚀 Project OS" },
      { type: "callout", text: "Single-page command center for everything in flight. KPIs at the top, projects + tasks side-by-side below." },

      { type: "h2", text: "📊 At a glance" },
      {
        type: "columns3",
        columns: [
          [{ type: "callout", text: "**Active projects**\nTrack big bets in the projects table below." }],
          [{ type: "callout", text: "**This week**\nUse the calendar view to see what's due." }],
          [{ type: "callout", text: "**Blocked**\nFilter the tasks board by status = Blocked." }],
        ],
      },

      { type: "h2", text: "📁 Projects" },
      { type: "database", databaseRef: "projects" },

      { type: "h2", text: "✅ Tasks" },
      {
        type: "columns2",
        columns: [
          [
            { type: "h3", text: "All tasks" },
            { type: "database", databaseRef: "tasks" },
          ],
          [
            { type: "h3", text: "Quick links" },
            { type: "bullet", text: "Sprint backlog → child page" },
            { type: "bullet", text: "Filter board by Status = In Progress" },
            { type: "bullet", text: "Calendar view = Due dates" },
            { type: "bullet", text: "Dashboard view = KPIs by status" },
          ],
        ],
      },
    ],
    databases: [
      {
        ref: "projects",
        name: "Projects",
        icon: "📁",
        properties: [
          { id: "name", name: "Project", type: "text" },
          {
            id: "stage",
            name: "Stage",
            type: "select",
            options: [
              { id: "ideation", name: "Ideation", color: "gray" },
              { id: "active", name: "Active", color: "blue" },
              { id: "shipped", name: "Shipped", color: "green" },
              { id: "paused", name: "Paused", color: "orange" },
            ],
          },
          {
            id: "priority",
            name: "Priority",
            type: "select",
            options: [
              { id: "p0", name: "P0", color: "red" },
              { id: "p1", name: "P1", color: "orange" },
              { id: "p2", name: "P2", color: "yellow" },
            ],
          },
          { id: "owner", name: "Owner", type: "text" },
          { id: "due", name: "Due", type: "date" },
        ],
        views: [
          { id: "v1", type: "table", name: "All projects", isDefault: true },
          { id: "v2", type: "board", name: "By stage", groupBy: "stage" },
        ],
        seedRows: [
          { props: { name: "Q2 Launch", stage: "active", priority: "p0", owner: "Alex", due: "2026-06-15" } },
          { props: { name: "Marketing site refresh", stage: "active", priority: "p1", owner: "Sam", due: "2026-05-30" } },
          { props: { name: "Internal tool migration", stage: "ideation", priority: "p2", owner: "Riya", due: "2026-07-20" } },
        ],
      },
      {
        ref: "tasks",
        name: "Tasks",
        icon: "✅",
        properties: [
          { id: "name", name: "Task", type: "text" },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "todo", name: "To do", color: "gray" },
              { id: "doing", name: "In progress", color: "blue" },
              { id: "blocked", name: "Blocked", color: "red" },
              { id: "done", name: "Done", color: "green" },
            ],
          },
          { id: "project", name: "Project", type: "relation", relationDatabaseRef: "projects" },
          { id: "due", name: "Due", type: "date" },
          { id: "estimate", name: "Estimate (h)", type: "number" },
          { id: "done", name: "Done", type: "checkbox" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "Kanban", groupBy: "status" },
          {
            id: "v3", type: "calendar", name: "Calendar",
            payload: { calendarDateProp: "due", calendarMode: "month" },
          },
          {
            id: "v4", type: "chart", name: "By status",
            payload: { chartKind: "bar", chartXProp: "status", chartAggregate: "count" },
          },
          {
            id: "v5", type: "dashboard", name: "Dashboard",
            payload: { dashboardKPIs: ["estimate"], dashboardBreakdowns: ["status"], dashboardRecentLimit: 5 },
          },
        ],
        seedRows: [
          { props: { name: "Wire payment provider", status: "doing", due: "2026-05-12", estimate: 8, done: false } },
          { props: { name: "Design hero illustration", status: "todo", due: "2026-05-18", estimate: 4, done: false } },
          { props: { name: "Migrate user table", status: "blocked", due: "2026-05-22", estimate: 16, done: false } },
          { props: { name: "Write release notes", status: "done", due: "2026-05-08", estimate: 1, done: true } },
        ],
      },
    ],
    children: [
      {
        ref: "sprint-backlog",
        title: "Sprint backlog",
        icon: "📌",
        blocks: [
          { type: "h1", text: "Sprint backlog" },
          { type: "callout", text: "Cherry-pick 6–8 tasks from the main board for this sprint. Drag here when committed." },
          { type: "todo", text: "Wire payment provider", checked: false },
          { type: "todo", text: "Design hero illustration", checked: false },
          { type: "todo", text: "Migrate user table", checked: false },
        ],
      },
    ],
  },
};
