import type { TemplateJson } from "../lib/validate";

/** Subscription Tracker — recurring payments w/ renewal calendar. */
export const subscriptionTracker: TemplateJson = {
  version: 1,
  name: "Subscription Tracker",
  icon: "🔁",
  category: "Finance",
  description: "Catalog every recurring charge, surface renewals on a calendar, and chart yearly spend.",
  page: {
    ref: "root",
    title: "Subscription Tracker",
    icon: "🔁",
    blocks: [
      { type: "h1", text: "🔁 Subscription Tracker" },
      { type: "callout", text: "Subscription creep is real. Audit quarterly: what got used? what didn't? cancel ruthlessly." },
      {
        type: "columns3",
        columns: [
          [{ type: "callout", text: "**Active**\nUsed in last 30 days." }],
          [{ type: "callout", text: "**Trial**\nCancel reminder set." }],
          [{ type: "callout", text: "**Cancelled**\nKept for receipts only." }],
        ],
      },
      { type: "h2", text: "📋 Subscriptions" },
      { type: "database", databaseRef: "subs" },
      { type: "h2", text: "Renewal calendar" },
      { type: "callout", text: "Use the Subscriptions calendar view to see what renews this month." },
    ],
    databases: [
      {
        ref: "subs",
        name: "Subscriptions",
        icon: "🔁",
        properties: [
          { id: "name", name: "Service", type: "text" },
          {
            id: "category",
            name: "Category",
            type: "select",
            options: [
              { id: "software", name: "Software", color: "blue" },
              { id: "media", name: "Media", color: "purple" },
              { id: "fitness", name: "Fitness", color: "green" },
              { id: "news", name: "News", color: "orange" },
              { id: "cloud", name: "Cloud", color: "yellow" },
              { id: "ai", name: "AI", color: "pink" },
            ],
          },
          { id: "amount", name: "Amount", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          {
            id: "cycle",
            name: "Cycle",
            type: "select",
            options: [
              { id: "monthly", name: "Monthly", color: "blue" },
              { id: "yearly", name: "Yearly", color: "green" },
              { id: "quarterly", name: "Quarterly", color: "purple" },
              { id: "lifetime", name: "Lifetime", color: "gray" },
            ],
          },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "active", name: "Active", color: "green" },
              { id: "trial", name: "Trial", color: "yellow" },
              { id: "cancelled", name: "Cancelled", color: "red" },
            ],
          },
          { id: "next_renewal", name: "Next renewal", type: "date" },
          { id: "started", name: "Started", type: "date" },
          { id: "yearly_cost", name: "Yearly", type: "formula", formulaExpression: "{{amount}} * 12" },
          { id: "url", name: "Manage URL", type: "url" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "calendar", name: "Renewals", payload: { calendarDateProp: "next_renewal" } },
          { id: "v3", type: "board", name: "By status", groupBy: "status" },
          { id: "v4", type: "board", name: "By category", groupBy: "category" },
          { id: "v5", type: "chart", name: "Spend by category", payload: { chartKind: "donut", chartXProp: "category", chartYProp: "amount", chartAggregate: "sum" } },
          { id: "v6", type: "dashboard", name: "Burn", payload: { dashboardKPIs: ["amount", "yearly_cost"], dashboardBreakdowns: ["category", "cycle", "status"], dashboardRecentLimit: 10 } },
        ],
        seedRows: [
          { props: { name: "Spotify Family", category: "media", amount: 17, cycle: "monthly", status: "active", next_renewal: "2026-06-01", started: "2024-01-15" } },
          { props: { name: "Notion AI", category: "ai", amount: 96, cycle: "yearly", status: "active", next_renewal: "2027-01-12", started: "2025-01-12" } },
          { props: { name: "Claude Pro", category: "ai", amount: 20, cycle: "monthly", status: "active", next_renewal: "2026-05-22", started: "2025-08-22" } },
          { props: { name: "Adobe Creative", category: "software", amount: 60, cycle: "monthly", status: "active", next_renewal: "2026-05-30", started: "2023-05-30" } },
          { props: { name: "NYT Digital", category: "news", amount: 17, cycle: "monthly", status: "active", next_renewal: "2026-05-25", started: "2024-05-25" } },
        ],
      },
    ],
  },
};
