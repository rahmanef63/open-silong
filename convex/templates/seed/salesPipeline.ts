import type { TemplateJson } from "../lib/validate";

/** Sales Pipeline — Deals + Companies + Activities. */
export const salesPipeline: TemplateJson = {
  version: 1,
  name: "Sales Pipeline",
  icon: "📞",
  category: "Business",
  description: "Pipeline by stage, companies, weighted forecast, activities (calls/emails/demos), close-rate dashboard.",
  page: {
    ref: "root",
    title: "Sales Pipeline",
    icon: "📞",
    blocks: [
      { type: "h1", text: "📞 Sales Pipeline" },
      { type: "callout", text: "Stage drives the kanban; weighted ARR drives the forecast. Log every touch into Activities." },
      {
        type: "columns5",
        columns: [
          [{ type: "callout", text: "**Lead**\nNew, unqualified." }],
          [{ type: "callout", text: "**Qualified**\nBudget + need confirmed." }],
          [{ type: "callout", text: "**Proposal**\nQuote sent." }],
          [{ type: "callout", text: "**Negotiation**\nLegal + procurement." }],
          [{ type: "callout", text: "**Closed**\nWon or lost." }],
        ],
      },
      { type: "h2", text: "💼 Deals" },
      { type: "database", databaseRef: "deals" },
      { type: "h2", text: "🏢 Companies + Activities" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Companies" }, { type: "database", databaseRef: "companies" }],
          [{ type: "h3", text: "Activities" }, { type: "database", databaseRef: "activities" }],
        ],
      },
    ],
    databases: [
      {
        ref: "companies",
        name: "Companies",
        icon: "🏢",
        properties: [
          { id: "name", name: "Company", type: "text" },
          { id: "domain", name: "Domain", type: "url" },
          {
            id: "tier",
            name: "Tier",
            type: "select",
            options: [
              { id: "smb", name: "SMB", color: "gray" },
              { id: "mid", name: "Mid-market", color: "blue" },
              { id: "ent", name: "Enterprise", color: "purple" },
            ],
          },
          { id: "industry", name: "Industry", type: "text" },
          { id: "headcount", name: "Headcount", type: "number" },
          { id: "owner", name: "AE", type: "text" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By tier", groupBy: "tier" },
          { id: "v3", type: "gallery", name: "Logos" },
        ],
        seedRows: [
          { props: { name: "Acme Corp", domain: "https://acme.example", tier: "ent", industry: "Manufacturing", headcount: 5400, owner: "Alex" } },
          { props: { name: "Globex", domain: "https://globex.example", tier: "mid", industry: "Logistics", headcount: 380, owner: "Sam" } },
          { props: { name: "Initech", domain: "https://initech.example", tier: "smb", industry: "Software", headcount: 42, owner: "Riya" } },
        ],
      },
      {
        ref: "deals",
        name: "Deals",
        icon: "💼",
        properties: [
          { id: "name", name: "Deal", type: "text" },
          { id: "company", name: "Company", type: "relation", relationDatabaseRef: "companies" },
          {
            id: "stage",
            name: "Stage",
            type: "select",
            options: [
              { id: "lead", name: "Lead", color: "gray" },
              { id: "qualified", name: "Qualified", color: "blue" },
              { id: "proposal", name: "Proposal", color: "yellow" },
              { id: "negotiation", name: "Negotiation", color: "orange" },
              { id: "won", name: "Won", color: "green" },
              { id: "lost", name: "Lost", color: "red" },
            ],
          },
          { id: "arr", name: "ARR", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "probability", name: "Win %", type: "number" },
          { id: "weighted", name: "Weighted ARR", type: "formula", formulaExpression: "{{arr}} * {{probability}} / 100" },
          { id: "close_date", name: "Close date", type: "date" },
          { id: "owner", name: "AE", type: "text" },
          {
            id: "source",
            name: "Source",
            type: "select",
            options: [
              { id: "inbound", name: "Inbound", color: "green" },
              { id: "outbound", name: "Outbound", color: "blue" },
              { id: "referral", name: "Referral", color: "purple" },
              { id: "event", name: "Event", color: "yellow" },
            ],
          },
        ],
        views: [
          { id: "v1", type: "board", name: "Pipeline", isDefault: true, groupBy: "stage" },
          { id: "v2", type: "table", name: "All deals" },
          { id: "v3", type: "calendar", name: "Close date", payload: { calendarDateProp: "close_date" } },
          { id: "v4", type: "chart", name: "Weighted by stage", payload: { chartKind: "bar", chartXProp: "stage", chartYProp: "weighted", chartAggregate: "sum" } },
          { id: "v5", type: "chart", name: "Source mix", payload: { chartKind: "donut", chartXProp: "source", chartYProp: "arr", chartAggregate: "sum" } },
          { id: "v6", type: "feed", name: "Activity feed", payload: { feedTimestamp: "updatedAt" } },
          { id: "v7", type: "dashboard", name: "Forecast", payload: { dashboardKPIs: ["arr", "weighted"], dashboardBreakdowns: ["stage", "source", "owner"], dashboardRecentLimit: 10 } },
        ],
        seedRows: [
          { props: { name: "Acme — Platform 2026", stage: "negotiation", arr: 240000, probability: 70, close_date: "2026-06-30", owner: "Alex", source: "outbound" } },
          { props: { name: "Globex — Pilot expansion", stage: "proposal", arr: 60000, probability: 50, close_date: "2026-06-15", owner: "Sam", source: "inbound" } },
          { props: { name: "Initech — Starter", stage: "qualified", arr: 12000, probability: 35, close_date: "2026-07-15", owner: "Riya", source: "referral" } },
          { props: { name: "Soylent — Renewal", stage: "won", arr: 84000, probability: 100, close_date: "2026-05-01", owner: "Alex", source: "inbound" } },
        ],
      },
      {
        ref: "activities",
        name: "Activities",
        icon: "📞",
        properties: [
          { id: "name", name: "Subject", type: "text" },
          {
            id: "type",
            name: "Type",
            type: "select",
            options: [
              { id: "call", name: "Call", color: "blue" },
              { id: "email", name: "Email", color: "gray" },
              { id: "demo", name: "Demo", color: "purple" },
              { id: "meeting", name: "Meeting", color: "green" },
            ],
          },
          { id: "deal", name: "Deal", type: "relation", relationDatabaseRef: "deals" },
          { id: "date", name: "When", type: "date" },
          { id: "owner", name: "AE", type: "text" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "calendar", name: "Calendar", payload: { calendarDateProp: "date" } },
          { id: "v3", type: "board", name: "By type", groupBy: "type" },
        ],
        seedRows: [
          { props: { name: "Discovery call", type: "call", date: "2026-05-13", owner: "Alex" } },
          { props: { name: "Demo for Globex", type: "demo", date: "2026-05-14", owner: "Sam" } },
        ],
      },
    ],
  },
};
