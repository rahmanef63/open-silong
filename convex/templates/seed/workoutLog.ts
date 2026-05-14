import type { TemplateJson } from "../lib/validate";

/** Workout Log — Sessions + Exercises + PRs. */
export const workoutLog: TemplateJson = {
  version: 1,
  name: "Workout Log",
  icon: "💪",
  category: "Health",
  description: "Log strength sessions, track PRs by lift, and chart weekly volume + bodyweight trend.",
  page: {
    ref: "root",
    title: "Workout Log",
    icon: "💪",
    blocks: [
      { type: "h1", text: "💪 Workout Log" },
      { type: "callout", text: "Log every set; the chart turns reps into a PR curve. Bodyweight goes alongside so volume comparisons are meaningful." },
      {
        type: "columns3",
        columns: [
          [{ type: "callout", text: "**Push**\nBench, OHP, dips." }],
          [{ type: "callout", text: "**Pull**\nRow, pull-up, deadlift." }],
          [{ type: "callout", text: "**Legs**\nSquat, RDL, lunge." }],
        ],
      },
      { type: "h2", text: "🏋️ Sessions" },
      { type: "database", databaseRef: "sessions" },
      { type: "h2", text: "📊 Exercises + PRs" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Exercises" }, { type: "database", databaseRef: "exercises" }],
          [{ type: "h3", text: "Bodyweight" }, { type: "database", databaseRef: "bodyweight" }],
        ],
      },
    ],
    databases: [
      {
        ref: "sessions",
        name: "Sessions",
        icon: "🏋️",
        properties: [
          { id: "name", name: "Session", type: "text" },
          { id: "date", name: "Date", type: "date" },
          {
            id: "kind",
            name: "Kind",
            type: "select",
            options: [
              { id: "push", name: "Push", color: "blue" },
              { id: "pull", name: "Pull", color: "green" },
              { id: "legs", name: "Legs", color: "purple" },
              { id: "full", name: "Full body", color: "orange" },
              { id: "cardio", name: "Cardio", color: "red" },
            ],
          },
          { id: "duration", name: "Min", type: "number" },
          { id: "rpe", name: "RPE 1-10", type: "number" },
          { id: "volume", name: "Volume (kg·reps)", type: "number" },
          { id: "notes", name: "Notes", type: "text" },
        ],
        views: [
          { id: "v1", type: "table", name: "All sessions", isDefault: true },
          { id: "v2", type: "calendar", name: "Calendar", payload: { calendarDateProp: "date" } },
          { id: "v3", type: "board", name: "By kind", groupBy: "kind" },
          { id: "v4", type: "chart", name: "Volume over time", payload: { chartKind: "line", chartXProp: "date", chartYProp: "volume", chartAggregate: "sum" } },
          { id: "v5", type: "chart", name: "Sessions per kind", payload: { chartKind: "donut", chartXProp: "kind", chartAggregate: "count" } },
          { id: "v6", type: "feed", name: "Recent", payload: { feedTimestamp: "createdAt" } },
          { id: "v7", type: "dashboard", name: "Weekly", payload: { dashboardKPIs: ["volume", "duration"], dashboardBreakdowns: ["kind"], dashboardRecentLimit: 7 } },
        ],
        seedRows: [
          { props: { name: "Push A", date: "2026-05-12", kind: "push", duration: 55, rpe: 8, volume: 4800, notes: "Bench felt strong" } },
          { props: { name: "Pull A", date: "2026-05-13", kind: "pull", duration: 50, rpe: 7, volume: 5200 } },
          { props: { name: "Legs A", date: "2026-05-14", kind: "legs", duration: 65, rpe: 9, volume: 7100, notes: "PR squat" } },
        ],
      },
      {
        ref: "exercises",
        name: "Exercises",
        icon: "📊",
        properties: [
          { id: "name", name: "Lift", type: "text" },
          {
            id: "muscle",
            name: "Muscle group",
            type: "multi_select",
            options: [
              { id: "chest", name: "Chest", color: "red" },
              { id: "back", name: "Back", color: "blue" },
              { id: "shoulders", name: "Shoulders", color: "purple" },
              { id: "quads", name: "Quads", color: "yellow" },
              { id: "hams", name: "Hamstrings", color: "green" },
              { id: "core", name: "Core", color: "gray" },
            ],
          },
          { id: "pr_kg", name: "PR (kg)", type: "number" },
          { id: "pr_reps", name: "PR reps", type: "number" },
          { id: "pr_date", name: "PR date", type: "date" },
          { id: "video", name: "Form video", type: "url" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By muscle", groupBy: "muscle" },
          { id: "v3", type: "chart", name: "PR by lift", payload: { chartKind: "bar", chartXProp: "name", chartYProp: "pr_kg", chartAggregate: "max" } },
        ],
        seedRows: [
          { props: { name: "Back squat", muscle: ["quads", "hams", "core"], pr_kg: 145, pr_reps: 5, pr_date: "2026-05-14" } },
          { props: { name: "Bench press", muscle: ["chest", "shoulders"], pr_kg: 105, pr_reps: 5, pr_date: "2026-04-28" } },
          { props: { name: "Deadlift", muscle: ["back", "hams"], pr_kg: 180, pr_reps: 3, pr_date: "2026-05-02" } },
        ],
      },
      {
        ref: "bodyweight",
        name: "Bodyweight",
        icon: "⚖️",
        properties: [
          { id: "name", name: "Note", type: "text" },
          { id: "date", name: "Date", type: "date" },
          { id: "kg", name: "Weight (kg)", type: "number", numberDecimals: 1 },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "chart", name: "Trend", payload: { chartKind: "line", chartXProp: "date", chartYProp: "kg", chartAggregate: "avg" } },
        ],
        seedRows: [
          { props: { name: "Morning", date: "2026-05-12", kg: 78.4 } },
          { props: { name: "Morning", date: "2026-05-13", kg: 78.1 } },
          { props: { name: "Morning", date: "2026-05-14", kg: 78.2 } },
        ],
      },
    ],
  },
};
