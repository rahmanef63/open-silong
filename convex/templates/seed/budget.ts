import type { TemplateJson } from "../lib/validate";

/** Monthly Budget — transactions w/ category split, plus budget envelopes. */
export const budget: TemplateJson = {
  version: 1,
  name: "Monthly Budget",
  icon: "💰",
  category: "Finance",
  description: "Envelope budgeting w/ income vs expense, per-category cap, and a chart of monthly burn.",
  page: {
    ref: "root",
    title: "Monthly Budget",
    icon: "💰",
    blocks: [
      { type: "h1", text: "💰 Monthly Budget" },
      { type: "callout", text: "Set envelope caps once, log transactions daily. Charts surface over-spends in 3 seconds." },
      {
        type: "columns4",
        columns: [
          [{ type: "callout", text: "**Income**\nLog every credit." }],
          [{ type: "callout", text: "**Fixed**\nRent, subs, utilities." }],
          [{ type: "callout", text: "**Variable**\nGroceries, fuel, fun." }],
          [{ type: "callout", text: "**Savings**\nAuto-transfer first." }],
        ],
      },
      { type: "h2", text: "💸 Transactions" },
      { type: "database", databaseRef: "txn" },
      { type: "h2", text: "📊 Envelopes" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Caps + actuals" }, { type: "database", databaseRef: "envelopes" }],
          [
            { type: "h3", text: "Rules of thumb" },
            { type: "bullet", text: "50/30/20 — needs / wants / savings" },
            { type: "bullet", text: "Pay yourself first" },
            { type: "bullet", text: "Review weekly, adjust monthly" },
            { type: "bullet", text: "Cap streaming subs at 5" },
          ],
        ],
      },
    ],
    databases: [
      {
        ref: "envelopes",
        name: "Envelopes",
        icon: "📊",
        properties: [
          { id: "name", name: "Envelope", type: "text" },
          {
            id: "category",
            name: "Category",
            type: "select",
            options: [
              { id: "needs", name: "Needs", color: "red" },
              { id: "wants", name: "Wants", color: "yellow" },
              { id: "savings", name: "Savings", color: "green" },
            ],
          },
          { id: "cap", name: "Monthly cap", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "spent", name: "Spent", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "remaining", name: "Remaining", type: "formula", formulaExpression: "{{cap}} - {{spent}}" },
        ],
        views: [
          { id: "v1", type: "table", name: "Envelopes", isDefault: true },
          { id: "v2", type: "board", name: "By 50/30/20", groupBy: "category" },
          { id: "v3", type: "chart", name: "Cap vs spent", payload: { chartKind: "bar", chartXProp: "name", chartYProp: "cap", chartAggregate: "sum" } },
        ],
        seedRows: [
          { props: { name: "Rent", category: "needs", cap: 1800, spent: 1800 } },
          { props: { name: "Groceries", category: "needs", cap: 500, spent: 320 } },
          { props: { name: "Eating out", category: "wants", cap: 200, spent: 240 } },
          { props: { name: "Streaming", category: "wants", cap: 60, spent: 55 } },
          { props: { name: "Emergency fund", category: "savings", cap: 1000, spent: 1000 } },
        ],
      },
      {
        ref: "txn",
        name: "Transactions",
        icon: "💸",
        properties: [
          { id: "name", name: "Description", type: "text" },
          { id: "amount", name: "Amount", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          {
            id: "type",
            name: "Type",
            type: "select",
            options: [
              { id: "income", name: "Income", color: "green" },
              { id: "expense", name: "Expense", color: "red" },
              { id: "transfer", name: "Transfer", color: "gray" },
            ],
          },
          { id: "envelope", name: "Envelope", type: "relation", relationDatabaseRef: "envelopes" },
          { id: "date", name: "Date", type: "date" },
          {
            id: "method",
            name: "Method",
            type: "select",
            options: [
              { id: "card", name: "Card", color: "blue" },
              { id: "cash", name: "Cash", color: "yellow" },
              { id: "transfer", name: "Transfer", color: "purple" },
            ],
          },
          { id: "merchant", name: "Merchant", type: "text" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By envelope", groupBy: "envelope" },
          { id: "v3", type: "calendar", name: "Calendar", payload: { calendarDateProp: "date" } },
          { id: "v4", type: "chart", name: "Daily burn", payload: { chartKind: "line", chartXProp: "date", chartYProp: "amount", chartAggregate: "sum" } },
          { id: "v5", type: "chart", name: "Type mix", payload: { chartKind: "donut", chartXProp: "type", chartYProp: "amount", chartAggregate: "sum" } },
          { id: "v6", type: "feed", name: "Recent", payload: { feedTimestamp: "createdAt" } },
          { id: "v7", type: "dashboard", name: "Month view", payload: { dashboardKPIs: ["amount"], dashboardBreakdowns: ["envelope", "type", "method"], dashboardRecentLimit: 10 } },
        ],
        seedRows: [
          { props: { name: "Salary deposit", amount: 4500, type: "income", date: "2026-05-01", method: "transfer", merchant: "Acme Corp" } },
          { props: { name: "Trader Joe's", amount: 87, type: "expense", date: "2026-05-12", method: "card", merchant: "Trader Joe's" } },
          { props: { name: "Coffee", amount: 5, type: "expense", date: "2026-05-13", method: "card", merchant: "Blue Bottle" } },
          { props: { name: "Rent", amount: 1800, type: "expense", date: "2026-05-01", method: "transfer", merchant: "Landlord" } },
        ],
      },
    ],
  },
};
