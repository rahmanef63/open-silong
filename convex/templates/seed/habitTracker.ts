import type { TemplateJson } from "../lib/validate";

export const habitTracker: TemplateJson = {
  version: 1,
  name: "Habit Tracker",
  icon: "✅",
  category: "Personal",
  description: "Daily check-in for habits — date, habit, and done flag.",
  page: {
    ref: "root",
    title: "Habit Tracker",
    icon: "✅",
    blocks: [
      { type: "h1", text: "Habits" },
      { type: "callout", text: "Tick a habit each day. Keep streaks going." },
      { type: "database", databaseRef: "habits" },
    ],
    databases: [
      {
        ref: "habits",
        name: "Daily check-ins",
        icon: "📅",
        properties: [
          { id: "name", name: "Habit", type: "text" },
          { id: "date", name: "Date", type: "date" },
          { id: "done", name: "Done", type: "checkbox" },
          {
            id: "category",
            name: "Category",
            type: "select",
            options: [
              { id: "health", name: "Health", color: "green" },
              { id: "learning", name: "Learning", color: "blue" },
              { id: "mind", name: "Mindfulness", color: "purple" },
            ],
          },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By category", groupBy: "category" },
        ],
        seedRows: [
          { props: { name: "Drink water", date: "2026-05-01", done: true, category: "health" } },
          { props: { name: "Read 20 min", date: "2026-05-01", done: true, category: "learning" } },
          { props: { name: "Meditate", date: "2026-05-01", done: false, category: "mind" } },
        ],
      },
    ],
  },
};
