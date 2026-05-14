import type { TemplateJson } from "../lib/validate";

/** Daily Journal — single-page journaling with mood + reflection databases. */
export const dailyJournal: TemplateJson = {
  version: 1,
  name: "Daily Journal",
  icon: "📓",
  category: "Personal",
  description: "Morning intentions + evening reflection w/ mood chart, gratitude log, and calendar view.",
  page: {
    ref: "root",
    title: "Daily Journal",
    icon: "📓",
    blocks: [
      { type: "h1", text: "📓 Daily Journal" },
      { type: "callout", text: "Two minutes in the morning, two at night. Mood graph reveals patterns over weeks." },
      {
        type: "columns3",
        columns: [
          [{ type: "callout", text: "**🌅 Morning**\nSet 1 intention. Note 3 to-dos." }],
          [{ type: "callout", text: "**🌙 Evening**\nReflect on wins. Rate mood 1-5." }],
          [{ type: "callout", text: "**📈 Trends**\nReview the chart weekly. Look for triggers." }],
        ],
      },
      { type: "h2", text: "📅 Entries" },
      { type: "database", databaseRef: "entries" },
      { type: "h2", text: "🙏 Gratitude" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Log" }, { type: "database", databaseRef: "gratitude" }],
          [
            { type: "h3", text: "Prompts" },
            { type: "bullet", text: "What surprised me today?" },
            { type: "bullet", text: "Who helped me, even slightly?" },
            { type: "bullet", text: "What did I learn?" },
            { type: "bullet", text: "What am I anticipating?" },
          ],
        ],
      },
    ],
    databases: [
      {
        ref: "entries",
        name: "Entries",
        icon: "📝",
        properties: [
          { id: "name", name: "Date title", type: "text" },
          { id: "date", name: "Date", type: "date" },
          {
            id: "mood",
            name: "Mood",
            type: "select",
            options: [
              { id: "5", name: "🤩 Great", color: "green" },
              { id: "4", name: "🙂 Good", color: "blue" },
              { id: "3", name: "😐 Meh", color: "gray" },
              { id: "2", name: "😕 Low", color: "orange" },
              { id: "1", name: "😞 Bad", color: "red" },
            ],
          },
          { id: "score", name: "Score", type: "number" },
          { id: "intention", name: "Intention", type: "text" },
          { id: "wins", name: "Wins", type: "text" },
          { id: "energy", name: "Energy 1-10", type: "number" },
          { id: "sleep", name: "Sleep (h)", type: "number" },
          {
            id: "tags",
            name: "Tags",
            type: "multi_select",
            options: [
              { id: "work", name: "Work", color: "blue" },
              { id: "family", name: "Family", color: "pink" },
              { id: "health", name: "Health", color: "green" },
              { id: "creative", name: "Creative", color: "purple" },
            ],
          },
        ],
        views: [
          { id: "v1", type: "table", name: "All entries", isDefault: true },
          { id: "v2", type: "calendar", name: "Calendar", payload: { calendarDateProp: "date", calendarMode: "month" } },
          { id: "v3", type: "chart", name: "Mood trend", payload: { chartKind: "line", chartXProp: "date", chartYProp: "score", chartAggregate: "avg" } },
          { id: "v4", type: "chart", name: "Energy", payload: { chartKind: "bar", chartXProp: "date", chartYProp: "energy", chartAggregate: "avg" } },
          { id: "v5", type: "feed", name: "Recent", payload: { feedTimestamp: "createdAt" } },
          { id: "v6", type: "dashboard", name: "Overview", payload: { dashboardKPIs: ["score", "energy", "sleep"], dashboardBreakdowns: ["mood", "tags"], dashboardRecentLimit: 5 } },
        ],
        seedRows: [
          { props: { name: "May 12 — Monday", date: "2026-05-12", mood: "4", score: 4, intention: "Ship the date editor", wins: "Got popover working", energy: 7, sleep: 7, tags: ["work"] } },
          { props: { name: "May 13 — Tuesday", date: "2026-05-13", mood: "5", score: 5, intention: "Field test new templates", wins: "Calendar grid finally renders", energy: 8, sleep: 8, tags: ["work", "creative"] } },
          { props: { name: "May 14 — Wednesday", date: "2026-05-14", mood: "3", score: 3, intention: "Catch up on email", wins: "Inbox zero by lunch", energy: 6, sleep: 6, tags: ["work"] } },
        ],
      },
      {
        ref: "gratitude",
        name: "Gratitude",
        icon: "🙏",
        properties: [
          { id: "name", name: "Note", type: "text" },
          { id: "date", name: "When", type: "date" },
          { id: "person", name: "Person", type: "text" },
          {
            id: "category",
            name: "Category",
            type: "select",
            options: [
              { id: "people", name: "People", color: "pink" },
              { id: "place", name: "Place", color: "green" },
              { id: "moment", name: "Moment", color: "blue" },
              { id: "growth", name: "Growth", color: "purple" },
            ],
          },
        ],
        views: [
          { id: "v1", type: "list", name: "List", isDefault: true },
          { id: "v2", type: "board", name: "By category", groupBy: "category" },
          { id: "v3", type: "gallery", name: "Gallery" },
        ],
        seedRows: [
          { props: { name: "Coffee with Sam", date: "2026-05-13", person: "Sam", category: "people" } },
          { props: { name: "First spring tomatoes", date: "2026-05-14", category: "moment" } },
        ],
      },
    ],
  },
};
