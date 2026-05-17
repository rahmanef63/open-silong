import type { TplDatabaseT } from "../../../lib/validate";

/** Project tracker — kanban + roadmap + dashboard.
 *  Relation: lead → contacts. */
export const projectsDb: TplDatabaseT = {
  ref: "projects",
  name: "Projects",
  icon: "🚀",
  properties: [
    { id: "name", name: "Name", type: "text" },
    {
      id: "status", name: "Status", type: "status",
      options: [
        { id: "todo", name: "Backlog", color: "gray" },
        { id: "active", name: "Active", color: "blue" },
        { id: "blocked", name: "Blocked", color: "red" },
        { id: "done", name: "Done", color: "green" },
      ],
    },
    {
      id: "priority", name: "Priority", type: "select",
      options: [
        { id: "p0", name: "P0 · Critical", color: "red" },
        { id: "p1", name: "P1 · High", color: "orange" },
        { id: "p2", name: "P2 · Medium", color: "yellow" },
        { id: "p3", name: "P3 · Low", color: "gray" },
      ],
    },
    { id: "lead", name: "Lead", type: "relation", relationDatabaseRef: "contacts" },
    { id: "start", name: "Start", type: "date" },
    { id: "due", name: "Due", type: "date" },
    { id: "budget", name: "Budget", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
    { id: "description", name: "Description", type: "text" },
    {
      id: "tags", name: "Tags", type: "multi_select",
      options: [
        { id: "eng", name: "Engineering", color: "blue" },
        { id: "design", name: "Design", color: "pink" },
        { id: "marketing", name: "Marketing", color: "purple" },
        { id: "ops", name: "Ops", color: "green" },
      ],
    },
    { id: "created", name: "Created", type: "created_time" },
  ],
  views: [
    { id: "v1", type: "table", name: "All projects", isDefault: true },
    { id: "v2", type: "board", name: "By status", groupBy: "status" },
    { id: "v3", type: "timeline", name: "Roadmap", payload: { timelineStartProp: "start", timelineEndProp: "due", timelineColorByProp: "status" } },
    { id: "v4", type: "dashboard", name: "Overview", payload: { dashboardKPIs: ["budget"], dashboardBreakdowns: ["status", "priority", "tags"], dashboardRecentLimit: 5 } },
  ],
};
