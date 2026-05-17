import type { TplDatabaseT } from "../../../lib/validate";

/** Tasks — kanban + calendar + chart.
 *  Relations: project → projects, assignee → contacts. */
export const tasksDb: TplDatabaseT = {
  ref: "tasks",
  name: "Tasks",
  icon: "✅",
  properties: [
    { id: "name", name: "Task", type: "text" },
    {
      id: "status", name: "Status", type: "status",
      options: [
        { id: "todo", name: "To do", color: "gray" },
        { id: "doing", name: "In progress", color: "blue" },
        { id: "review", name: "In review", color: "purple" },
        { id: "done", name: "Done", color: "green" },
      ],
    },
    { id: "project", name: "Project", type: "relation", relationDatabaseRef: "projects" },
    { id: "assignee", name: "Assignee", type: "relation", relationDatabaseRef: "contacts" },
    { id: "due", name: "Due", type: "date" },
    {
      id: "priority", name: "Priority", type: "select",
      options: [
        { id: "urgent", name: "Urgent", color: "red" },
        { id: "high", name: "High", color: "orange" },
        { id: "med", name: "Medium", color: "yellow" },
        { id: "low", name: "Low", color: "gray" },
      ],
    },
    { id: "estimate", name: "Estimate (h)", type: "number", numberFormat: "decimal", numberDecimals: 1 },
    { id: "done", name: "Done?", type: "checkbox" },
    {
      id: "labels", name: "Labels", type: "multi_select",
      options: [
        { id: "bug", name: "bug", color: "red" },
        { id: "feat", name: "feature", color: "blue" },
        { id: "chore", name: "chore", color: "gray" },
        { id: "docs", name: "docs", color: "purple" },
      ],
    },
    { id: "ticket", name: "Ticket", type: "unique_id", uniqueIdPrefix: "TASK" },
    { id: "updated", name: "Updated", type: "last_edited_time" },
  ],
  views: [
    { id: "v1", type: "table", name: "All tasks", isDefault: true },
    { id: "v2", type: "board", name: "Kanban", groupBy: "status" },
    { id: "v3", type: "calendar", name: "Due dates", payload: { calendarDateProp: "due" } },
    { id: "v4", type: "list", name: "Backlog list" },
    { id: "v5", type: "chart", name: "By priority", payload: { chartKind: "bar", chartXProp: "priority", chartYProp: "estimate", chartAggregate: "sum" } },
  ],
};
