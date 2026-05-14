import type { TemplateJson } from "../lib/validate";

/** Meeting Notes — meetings db + action items db, linked via relation. */
export const meetingNotes: TemplateJson = {
  version: 1,
  name: "Meeting Notes",
  icon: "🗣️",
  category: "Productivity",
  description: "Capture meetings, attendees, decisions, and convert discussions into tracked action items.",
  page: {
    ref: "root",
    title: "Meeting Notes",
    icon: "🗣️",
    blocks: [
      { type: "h1", text: "🗣️ Meeting Notes" },
      { type: "callout", text: "Templates for 1:1s, standups, retros, and brainstorms. Action items roll up to the second database." },
      {
        type: "columns4",
        columns: [
          [{ type: "callout", text: "**This week**\nFilter Meetings → Date is this week." }],
          [{ type: "callout", text: "**My actions**\nFilter Actions → Owner = me." }],
          [{ type: "callout", text: "**Overdue**\nActions → Due < today, not Done." }],
          [{ type: "callout", text: "**Recurring**\nMark series → repeats weekly." }],
        ],
      },
      { type: "h2", text: "📅 Meetings" },
      { type: "database", databaseRef: "meetings" },
      { type: "h2", text: "🎯 Action items" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Open" }, { type: "database", databaseRef: "actions" }],
          [
            { type: "h3", text: "Cadences" },
            { type: "bullet", text: "1:1 — weekly, 30 min, 3 topics + 1 ask" },
            { type: "bullet", text: "Standup — daily, 15 min, blockers only" },
            { type: "bullet", text: "Retro — biweekly, 60 min, plus/delta" },
            { type: "bullet", text: "Brainstorm — ad-hoc, 45 min, diverge then converge" },
          ],
        ],
      },
    ],
    databases: [
      {
        ref: "meetings",
        name: "Meetings",
        icon: "📅",
        properties: [
          { id: "name", name: "Title", type: "text" },
          { id: "date", name: "Date", type: "date" },
          {
            id: "kind",
            name: "Kind",
            type: "select",
            options: [
              { id: "1on1", name: "1:1", color: "blue" },
              { id: "standup", name: "Standup", color: "green" },
              { id: "retro", name: "Retro", color: "purple" },
              { id: "brainstorm", name: "Brainstorm", color: "yellow" },
              { id: "review", name: "Review", color: "orange" },
            ],
          },
          { id: "attendees", name: "Attendees", type: "text" },
          { id: "duration", name: "Min", type: "number" },
          { id: "decisions", name: "Decisions", type: "text" },
          { id: "link", name: "Doc / recording", type: "url" },
        ],
        views: [
          { id: "v1", type: "table", name: "All meetings", isDefault: true },
          { id: "v2", type: "calendar", name: "Calendar", payload: { calendarDateProp: "date", calendarMode: "month" } },
          { id: "v3", type: "board", name: "By kind", groupBy: "kind" },
          { id: "v4", type: "feed", name: "Recent", payload: { feedTimestamp: "updatedAt" } },
          { id: "v5", type: "dashboard", name: "Overview", payload: { dashboardKPIs: ["duration"], dashboardBreakdowns: ["kind"], dashboardRecentLimit: 6 } },
        ],
        seedRows: [
          { props: { name: "Sprint planning", date: "2026-05-13", kind: "review", attendees: "Whole team", duration: 60, decisions: "Cut 3 stretch tasks", link: "https://meet.example.com/abc" } },
          { props: { name: "1:1 with Sam", date: "2026-05-14", kind: "1on1", attendees: "Sam", duration: 30, decisions: "Promote to senior in Q3" } },
          { props: { name: "Daily standup", date: "2026-05-14", kind: "standup", attendees: "Eng team", duration: 15 } },
        ],
      },
      {
        ref: "actions",
        name: "Action items",
        icon: "🎯",
        properties: [
          { id: "name", name: "Action", type: "text" },
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
          { id: "owner", name: "Owner", type: "text" },
          { id: "due", name: "Due", type: "date" },
          { id: "meeting", name: "From meeting", type: "relation", relationDatabaseRef: "meetings" },
          {
            id: "priority",
            name: "Priority",
            type: "select",
            options: [
              { id: "high", name: "High", color: "red" },
              { id: "med", name: "Medium", color: "yellow" },
              { id: "low", name: "Low", color: "gray" },
            ],
          },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "Status board", groupBy: "status" },
          { id: "v3", type: "calendar", name: "Calendar", payload: { calendarDateProp: "due" } },
          { id: "v4", type: "timeline", name: "Timeline", payload: { timelineStartProp: "due", timelineZoom: "week" } },
          { id: "v5", type: "chart", name: "By priority", payload: { chartKind: "donut", chartXProp: "priority", chartAggregate: "count" } },
        ],
        seedRows: [
          { props: { name: "Cut deck for review", status: "todo", owner: "Alex", due: "2026-05-15", priority: "high" } },
          { props: { name: "Update OKR doc", status: "doing", owner: "Sam", due: "2026-05-16", priority: "med" } },
          { props: { name: "Order new monitor", status: "done", owner: "Riya", due: "2026-05-12", priority: "low" } },
        ],
      },
    ],
  },
};
