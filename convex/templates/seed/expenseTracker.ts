import type { TemplateJson } from "../lib/validate";

export const expenseTracker: TemplateJson = {
  version: 1,
  name: "Expense Tracker",
  icon: "💸",
  category: "Finance",
  description: "Log expenses by category with table + board views.",
  page: {
    ref: "root",
    title: "Expense Tracker",
    icon: "💸",
    blocks: [
      { type: "h1", text: "Expenses" },
      { type: "callout", text: "Log every expense in the table below. Group by category in the board view." },
      { type: "database", databaseRef: "expenses" },
    ],
    databases: [
      {
        ref: "expenses",
        name: "Expenses",
        icon: "💰",
        properties: [
          { id: "name", name: "Name", type: "text" },
          { id: "amount", name: "Amount", type: "number", numberFormat: "currency" },
          {
            id: "category",
            name: "Category",
            type: "select",
            options: [
              { id: "food", name: "Food", color: "orange" },
              { id: "rent", name: "Rent", color: "blue" },
              { id: "transport", name: "Transport", color: "green" },
              { id: "fun", name: "Fun", color: "purple" },
              { id: "other", name: "Other", color: "gray" },
            ],
          },
          { id: "date", name: "Date", type: "date" },
          { id: "paid", name: "Paid", type: "checkbox" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By category", groupBy: "category" },
        ],
        seedRows: [
          { props: { name: "Groceries", amount: 80, category: "food", date: "2026-05-01", paid: true } },
          { props: { name: "Apartment", amount: 1200, category: "rent", date: "2026-05-01", paid: false } },
          { props: { name: "Bus pass", amount: 60, category: "transport", date: "2026-05-02", paid: true } },
        ],
      },
    ],
  },
};
