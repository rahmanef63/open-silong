import type { TemplateJson } from "../lib/validate";

/** Course Tracker — Courses + Lessons + Assignments. */
export const courseTracker: TemplateJson = {
  version: 1,
  name: "Course Tracker",
  icon: "🎓",
  category: "Education",
  description: "Online + uni courses. Lesson progress, assignments w/ due dates, GPA-style grade dashboard.",
  page: {
    ref: "root",
    title: "Course Tracker",
    icon: "🎓",
    blocks: [
      { type: "h1", text: "🎓 Course Tracker" },
      { type: "callout", text: "One row per course. Lessons + assignments link back. Calendar surfaces upcoming due dates." },
      {
        type: "columns3",
        columns: [
          [{ type: "callout", text: "**Active**\nIn-progress this term." }],
          [{ type: "callout", text: "**On deck**\nQueued for next term." }],
          [{ type: "callout", text: "**Completed**\nArchive — useful for resume." }],
        ],
      },
      { type: "h2", text: "📚 Courses" },
      { type: "database", databaseRef: "courses" },
      { type: "h2", text: "📖 Lessons" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "All lessons" }, { type: "database", databaseRef: "lessons" }],
          [{ type: "h3", text: "Assignments" }, { type: "database", databaseRef: "assignments" }],
        ],
      },
    ],
    databases: [
      {
        ref: "courses",
        name: "Courses",
        icon: "📚",
        properties: [
          { id: "name", name: "Course", type: "text" },
          { id: "instructor", name: "Instructor", type: "text" },
          { id: "platform", name: "Platform", type: "text" },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "ondeck", name: "On deck", color: "gray" },
              { id: "active", name: "Active", color: "blue" },
              { id: "complete", name: "Completed", color: "green" },
              { id: "dropped", name: "Dropped", color: "red" },
            ],
          },
          { id: "start", name: "Start", type: "date" },
          { id: "end", name: "End", type: "date" },
          { id: "credits", name: "Credits", type: "number" },
          { id: "grade", name: "Grade %", type: "number" },
          { id: "url", name: "Link", type: "url" },
        ],
        views: [
          { id: "v1", type: "table", name: "All courses", isDefault: true },
          { id: "v2", type: "board", name: "By status", groupBy: "status" },
          { id: "v3", type: "timeline", name: "Term", payload: { timelineStartProp: "start", timelineEndProp: "end", timelineZoom: "month" } },
          { id: "v4", type: "chart", name: "Grade dist", payload: { chartKind: "bar", chartXProp: "name", chartYProp: "grade", chartAggregate: "avg" } },
          { id: "v5", type: "dashboard", name: "Transcript", payload: { dashboardKPIs: ["credits", "grade"], dashboardBreakdowns: ["status", "platform"], dashboardRecentLimit: 8 } },
        ],
        seedRows: [
          { props: { name: "Real Analysis I", instructor: "Prof. Lee", platform: "Stanford OYO", status: "active", start: "2026-04-01", end: "2026-06-15", credits: 4, grade: 88 } },
          { props: { name: "System Design", instructor: "ByteByteGo", platform: "ByteByteGo", status: "active", start: "2026-05-01", end: "2026-07-01", credits: 3, grade: 92 } },
          { props: { name: "Spanish A2", instructor: "—", platform: "Duolingo", status: "ondeck", start: "2026-07-01", end: "2026-12-31", credits: 0, grade: 0 } },
        ],
      },
      {
        ref: "lessons",
        name: "Lessons",
        icon: "📖",
        properties: [
          { id: "name", name: "Lesson", type: "text" },
          { id: "course", name: "Course", type: "relation", relationDatabaseRef: "courses" },
          { id: "done", name: "Done", type: "checkbox" },
          { id: "minutes", name: "Minutes", type: "number" },
          { id: "watched", name: "Watched", type: "date" },
        ],
        views: [
          { id: "v1", type: "list", name: "List", isDefault: true },
          { id: "v2", type: "board", name: "By course", groupBy: "course" },
          { id: "v3", type: "calendar", name: "Calendar", payload: { calendarDateProp: "watched" } },
        ],
        seedRows: [
          { props: { name: "Lecture 1: Sets and Functions", done: true, minutes: 70, watched: "2026-04-02" } },
          { props: { name: "Lecture 2: Cardinality", done: true, minutes: 65, watched: "2026-04-04" } },
          { props: { name: "CAP Theorem", done: false, minutes: 45 } },
        ],
      },
      {
        ref: "assignments",
        name: "Assignments",
        icon: "📝",
        properties: [
          { id: "name", name: "Assignment", type: "text" },
          { id: "course", name: "Course", type: "relation", relationDatabaseRef: "courses" },
          { id: "due", name: "Due", type: "date" },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "todo", name: "To do", color: "gray" },
              { id: "doing", name: "Working", color: "blue" },
              { id: "submitted", name: "Submitted", color: "purple" },
              { id: "graded", name: "Graded", color: "green" },
            ],
          },
          { id: "score", name: "Score", type: "number" },
          { id: "weight", name: "Weight %", type: "number" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "calendar", name: "Calendar", payload: { calendarDateProp: "due" } },
          { id: "v3", type: "board", name: "By status", groupBy: "status" },
          { id: "v4", type: "chart", name: "Avg score", payload: { chartKind: "bar", chartXProp: "course", chartYProp: "score", chartAggregate: "avg" } },
        ],
        seedRows: [
          { props: { name: "Problem set 1", due: "2026-05-09", status: "graded", score: 92, weight: 15 } },
          { props: { name: "Midterm", due: "2026-05-25", status: "todo", weight: 30 } },
        ],
      },
    ],
  },
};
