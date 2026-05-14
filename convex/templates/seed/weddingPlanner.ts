import type { TemplateJson } from "../lib/validate";

/** Wedding Planner — Tasks + Vendors + Guests + Budget. */
export const weddingPlanner: TemplateJson = {
  version: 1,
  name: "Wedding Planner",
  icon: "💍",
  category: "Events",
  description: "Countdown timeline, vendor contacts, RSVP tracker, budget breakdown, seating chart.",
  page: {
    ref: "root",
    title: "Wedding Planner",
    icon: "💍",
    blocks: [
      { type: "h1", text: "💍 Wedding Planner" },
      { type: "callout", text: "Six-month timeline. Tasks roll up to the calendar. Vendor + RSVP databases stay live until the day-of." },
      {
        type: "columns4",
        columns: [
          [{ type: "callout", text: "**Venue**\nSecure first." }],
          [{ type: "callout", text: "**Vendors**\nPhoto, food, music." }],
          [{ type: "callout", text: "**Guests**\nSave the dates → RSVP." }],
          [{ type: "callout", text: "**Day-of**\nTimeline + emergency kit." }],
        ],
      },
      { type: "h2", text: "✅ Tasks" },
      { type: "database", databaseRef: "tasks" },
      { type: "h2", text: "💼 Vendors + Budget" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Vendors" }, { type: "database", databaseRef: "vendors" }],
          [{ type: "h3", text: "Budget" }, { type: "database", databaseRef: "budget" }],
        ],
      },
      { type: "h2", text: "👥 Guests" },
      { type: "database", databaseRef: "guests" },
    ],
    databases: [
      {
        ref: "tasks",
        name: "Tasks",
        icon: "✅",
        properties: [
          { id: "name", name: "Task", type: "text" },
          { id: "due", name: "Due", type: "date" },
          {
            id: "phase",
            name: "Phase",
            type: "select",
            options: [
              { id: "12mo", name: "12+ months out", color: "purple" },
              { id: "6mo", name: "6 months", color: "blue" },
              { id: "3mo", name: "3 months", color: "yellow" },
              { id: "1mo", name: "1 month", color: "orange" },
              { id: "week", name: "Week of", color: "red" },
              { id: "dayof", name: "Day of", color: "pink" },
            ],
          },
          { id: "owner", name: "Owner", type: "text" },
          { id: "done", name: "Done", type: "checkbox" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By phase", groupBy: "phase" },
          { id: "v3", type: "calendar", name: "Calendar", payload: { calendarDateProp: "due" } },
          { id: "v4", type: "timeline", name: "Countdown", payload: { timelineStartProp: "due", timelineZoom: "month" } },
        ],
        seedRows: [
          { props: { name: "Book venue", due: "2026-06-01", phase: "12mo", owner: "Both", done: true } },
          { props: { name: "Send save-the-dates", due: "2026-12-01", phase: "6mo", owner: "Partner A", done: false } },
          { props: { name: "Final headcount to caterer", due: "2027-04-15", phase: "1mo", owner: "Partner B", done: false } },
        ],
      },
      {
        ref: "vendors",
        name: "Vendors",
        icon: "💼",
        properties: [
          { id: "name", name: "Vendor", type: "text" },
          {
            id: "kind",
            name: "Kind",
            type: "select",
            options: [
              { id: "venue", name: "Venue", color: "purple" },
              { id: "photo", name: "Photo/Video", color: "blue" },
              { id: "catering", name: "Catering", color: "orange" },
              { id: "music", name: "Music", color: "yellow" },
              { id: "florist", name: "Florist", color: "pink" },
              { id: "officiant", name: "Officiant", color: "green" },
              { id: "attire", name: "Attire", color: "gray" },
            ],
          },
          { id: "contact", name: "Contact", type: "text" },
          { id: "phone", name: "Phone", type: "phone" },
          { id: "email", name: "Email", type: "email" },
          { id: "deposit", name: "Deposit", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "balance", name: "Balance", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "booked", name: "Booked", type: "checkbox" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By kind", groupBy: "kind" },
          { id: "v3", type: "chart", name: "Spend by kind", payload: { chartKind: "donut", chartXProp: "kind", chartYProp: "balance", chartAggregate: "sum" } },
        ],
        seedRows: [
          { props: { name: "Vineyard Estate", kind: "venue", contact: "Maria", phone: "+1-555-0142", email: "events@vineyard.example", deposit: 3000, balance: 9000, booked: true } },
          { props: { name: "Golden Hour Photo", kind: "photo", contact: "James", phone: "+1-555-0188", email: "hi@goldenhour.example", deposit: 1500, balance: 3500, booked: true } },
        ],
      },
      {
        ref: "budget",
        name: "Budget",
        icon: "💰",
        properties: [
          { id: "name", name: "Item", type: "text" },
          {
            id: "category",
            name: "Category",
            type: "select",
            options: [
              { id: "venue", name: "Venue", color: "purple" },
              { id: "food", name: "Food/Bar", color: "orange" },
              { id: "photo", name: "Photo", color: "blue" },
              { id: "decor", name: "Decor", color: "pink" },
              { id: "attire", name: "Attire", color: "gray" },
              { id: "other", name: "Other", color: "yellow" },
            ],
          },
          { id: "estimate", name: "Estimate", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "actual", name: "Actual", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "diff", name: "Diff", type: "formula", formulaExpression: "{{actual}} - {{estimate}}" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By category", groupBy: "category" },
          { id: "v3", type: "chart", name: "Estimate vs actual", payload: { chartKind: "bar", chartXProp: "category", chartYProp: "actual", chartAggregate: "sum" } },
          { id: "v4", type: "dashboard", name: "Total", payload: { dashboardKPIs: ["estimate", "actual"], dashboardBreakdowns: ["category"], dashboardRecentLimit: 8 } },
        ],
        seedRows: [
          { props: { name: "Venue rental", category: "venue", estimate: 12000, actual: 12000 } },
          { props: { name: "Catering", category: "food", estimate: 9000, actual: 0 } },
        ],
      },
      {
        ref: "guests",
        name: "Guests",
        icon: "👥",
        properties: [
          { id: "name", name: "Name", type: "text" },
          {
            id: "side",
            name: "Side",
            type: "select",
            options: [
              { id: "a", name: "Partner A", color: "blue" },
              { id: "b", name: "Partner B", color: "pink" },
              { id: "both", name: "Both", color: "purple" },
            ],
          },
          {
            id: "rsvp",
            name: "RSVP",
            type: "select",
            options: [
              { id: "pending", name: "Pending", color: "gray" },
              { id: "yes", name: "Yes", color: "green" },
              { id: "no", name: "No", color: "red" },
              { id: "maybe", name: "Maybe", color: "yellow" },
            ],
          },
          { id: "plus_one", name: "+1", type: "checkbox" },
          { id: "table", name: "Table #", type: "number" },
          { id: "diet", name: "Dietary", type: "text" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By RSVP", groupBy: "rsvp" },
          { id: "v3", type: "board", name: "By table", groupBy: "table" },
          { id: "v4", type: "chart", name: "RSVP mix", payload: { chartKind: "donut", chartXProp: "rsvp", chartAggregate: "count" } },
        ],
        seedRows: [
          { props: { name: "Mom A", side: "a", rsvp: "yes", plus_one: false, table: 1 } },
          { props: { name: "Sarah & David", side: "both", rsvp: "yes", plus_one: true, table: 4, diet: "Veg" } },
        ],
      },
    ],
  },
};
