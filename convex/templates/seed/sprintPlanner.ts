import type { TemplateJson } from "../lib/validate";

/** Sprint Planner — Stories + Sprints, with timeline + capacity. */
export const sprintPlanner: TemplateJson = {
  version: 1,
  name: "Sprint Planner",
  icon: "🏁",
  category: "Productivity",
  description: "Two-week sprints w/ stories, points, owners, capacity chart, and Gantt-style timeline.",
  page: {
    ref: "root",
    title: "Sprint Planner",
    icon: "🏁",
    blocks: [
      { type: "h1", text: "🏁 Sprint Planner" },
      { type: "callout", text: "One row per story, one row per sprint. Capacity chart flags over-commit; timeline shows sequencing." },
      {
        type: "columns3",
        columns: [
          [{ type: "callout", text: "**Plan**\nDrag stories into the active sprint." }],
          [{ type: "callout", text: "**Track**\nMove story cards across the kanban during stand-ups." }],
          [{ type: "callout", text: "**Review**\nRetro from the chart view at sprint end." }],
        ],
      },
      { type: "h2", text: "📦 Sprints" },
      { type: "database", databaseRef: "sprints" },
      { type: "h2", text: "📋 Stories" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Backlog → board" }, { type: "database", databaseRef: "stories" }],
          [
            { type: "h3", text: "Definition of done" },
            { type: "todo", text: "Tests pass", checked: false },
            { type: "todo", text: "Docs updated", checked: false },
            { type: "todo", text: "Deployed to staging", checked: false },
            { type: "todo", text: "PM signoff", checked: false },
          ],
        ],
      },
    ],
    databases: [
      {
        ref: "sprints",
        name: "Sprints",
        icon: "📦",
        properties: [
          { id: "name", name: "Sprint", type: "text" },
          { id: "start", name: "Start", type: "date" },
          { id: "end", name: "End", type: "date" },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "future", name: "Future", color: "gray" },
              { id: "active", name: "Active", color: "blue" },
              { id: "closed", name: "Closed", color: "green" },
            ],
          },
          { id: "goal", name: "Goal", type: "text" },
          { id: "capacity", name: "Capacity (pts)", type: "number" },
          { id: "committed", name: "Committed", type: "number" },
        ],
        views: [
          { id: "v1", type: "table", name: "All sprints", isDefault: true },
          { id: "v2", type: "timeline", name: "Roadmap", payload: { timelineStartProp: "start", timelineEndProp: "end", timelineZoom: "month" } },
          { id: "v3", type: "chart", name: "Capacity vs committed", payload: { chartKind: "bar", chartXProp: "name", chartYProp: "capacity", chartAggregate: "sum" } },
        ],
        seedRows: [
          { props: { name: "Sprint 21", start: "2026-05-05", end: "2026-05-18", status: "active", goal: "Ship date editor", capacity: 30, committed: 28 } },
          { props: { name: "Sprint 22", start: "2026-05-19", end: "2026-06-01", status: "future", goal: "Templates v2", capacity: 30, committed: 22 } },
          { props: { name: "Sprint 20", start: "2026-04-21", end: "2026-05-04", status: "closed", goal: "Auth hardening", capacity: 30, committed: 31 } },
        ],
      },
      {
        ref: "stories",
        name: "Stories",
        icon: "📋",
        properties: [
          { id: "name", name: "Story", type: "text" },
          { id: "sprint", name: "Sprint", type: "relation", relationDatabaseRef: "sprints" },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "backlog", name: "Backlog", color: "gray" },
              { id: "ready", name: "Ready", color: "yellow" },
              { id: "doing", name: "In progress", color: "blue" },
              { id: "review", name: "In review", color: "purple" },
              { id: "done", name: "Done", color: "green" },
            ],
          },
          {
            id: "type",
            name: "Type",
            type: "select",
            options: [
              { id: "feature", name: "Feature", color: "blue" },
              { id: "bug", name: "Bug", color: "red" },
              { id: "chore", name: "Chore", color: "gray" },
              { id: "spike", name: "Spike", color: "purple" },
            ],
          },
          { id: "points", name: "Points", type: "number" },
          { id: "owner", name: "Owner", type: "text" },
          { id: "due", name: "Due", type: "date" },
        ],
        views: [
          { id: "v1", type: "table", name: "All stories", isDefault: true },
          { id: "v2", type: "board", name: "Kanban", groupBy: "status" },
          { id: "v3", type: "board", name: "By type", groupBy: "type" },
          { id: "v4", type: "calendar", name: "Calendar", payload: { calendarDateProp: "due" } },
          { id: "v5", type: "chart", name: "Points by status", payload: { chartKind: "bar", chartXProp: "status", chartYProp: "points", chartAggregate: "sum" } },
          { id: "v6", type: "dashboard", name: "Sprint health", payload: { dashboardKPIs: ["points"], dashboardBreakdowns: ["status", "type"], dashboardRecentLimit: 8 } },
        ],
        seedRows: [
          { props: { name: "Date editor popover", status: "done", type: "feature", points: 5, owner: "Alex", due: "2026-05-13" } },
          { props: { name: "Calendar v9 migration", status: "done", type: "bug", points: 2, owner: "Alex", due: "2026-05-14" } },
          { props: { name: "Template gallery v2", status: "doing", type: "feature", points: 8, owner: "Sam", due: "2026-05-18" } },
          { props: { name: "Mobile a11y audit", status: "ready", type: "chore", points: 3, owner: "Riya", due: "2026-05-17" } },
        ],
      },
    ],
  },
};
