import type { TemplateJson } from "../lib/validate";

/** Product Roadmap — initiatives db with timeline + theme + status. */
export const roadmap: TemplateJson = {
  version: 1,
  name: "Product Roadmap",
  icon: "🗺️",
  category: "Productivity",
  description: "Quarter-grained initiatives with themes, OKR links, status, and a Gantt timeline view.",
  page: {
    ref: "root",
    title: "Product Roadmap",
    icon: "🗺️",
    blocks: [
      { type: "h1", text: "🗺️ Product Roadmap" },
      { type: "callout", text: "Themes group initiatives. Timeline shows the next two quarters at a glance." },
      {
        type: "columns3",
        columns: [
          [{ type: "callout", text: "**Now**\nShipping in 4-6 weeks." }],
          [{ type: "callout", text: "**Next**\nThis quarter, after current commitments." }],
          [{ type: "callout", text: "**Later**\nCommitted but not scoped." }],
        ],
      },
      { type: "h2", text: "🚀 Initiatives" },
      { type: "database", databaseRef: "initiatives" },
      { type: "h2", text: "🎨 Themes" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Strategic themes" }, { type: "database", databaseRef: "themes" }],
          [
            { type: "h3", text: "Process" },
            { type: "bullet", text: "Themes set yearly by leadership" },
            { type: "bullet", text: "Initiatives spec'd quarterly by product" },
            { type: "bullet", text: "Status synced weekly from sprint board" },
            { type: "bullet", text: "Public roadmap exported monthly" },
          ],
        ],
      },
    ],
    databases: [
      {
        ref: "themes",
        name: "Themes",
        icon: "🎨",
        properties: [
          { id: "name", name: "Theme", type: "text" },
          { id: "owner", name: "Lead", type: "text" },
          { id: "summary", name: "Summary", type: "text" },
          {
            id: "color",
            name: "Color",
            type: "select",
            options: [
              { id: "growth", name: "Growth", color: "blue" },
              { id: "retention", name: "Retention", color: "green" },
              { id: "platform", name: "Platform", color: "purple" },
              { id: "trust", name: "Trust", color: "orange" },
            ],
          },
        ],
        views: [
          { id: "v1", type: "gallery", name: "Themes", isDefault: true },
          { id: "v2", type: "table", name: "Table" },
          { id: "v3", type: "board", name: "By color", groupBy: "color" },
        ],
        seedRows: [
          { props: { name: "Onboarding", owner: "Sam", summary: "Time to first value < 2 min", color: "growth" } },
          { props: { name: "Reliability", owner: "Alex", summary: "99.95% monthly uptime", color: "platform" } },
          { props: { name: "Compliance", owner: "Riya", summary: "SOC2 Type 2 by EOY", color: "trust" } },
        ],
      },
      {
        ref: "initiatives",
        name: "Initiatives",
        icon: "🚀",
        properties: [
          { id: "name", name: "Initiative", type: "text" },
          { id: "theme", name: "Theme", type: "relation", relationDatabaseRef: "themes" },
          {
            id: "horizon",
            name: "Horizon",
            type: "select",
            options: [
              { id: "now", name: "Now", color: "green" },
              { id: "next", name: "Next", color: "blue" },
              { id: "later", name: "Later", color: "gray" },
            ],
          },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "scoping", name: "Scoping", color: "gray" },
              { id: "building", name: "Building", color: "blue" },
              { id: "rolling", name: "Rolling out", color: "yellow" },
              { id: "shipped", name: "Shipped", color: "green" },
              { id: "paused", name: "Paused", color: "orange" },
            ],
          },
          { id: "start", name: "Start", type: "date" },
          { id: "end", name: "End", type: "date" },
          { id: "owner", name: "DRI", type: "text" },
          { id: "confidence", name: "Confidence 1-10", type: "number" },
          { id: "doc", name: "Spec", type: "url" },
        ],
        views: [
          { id: "v1", type: "timeline", name: "Roadmap", isDefault: true, payload: { timelineStartProp: "start", timelineEndProp: "end", timelineZoom: "month" } },
          { id: "v2", type: "board", name: "Now / Next / Later", groupBy: "horizon" },
          { id: "v3", type: "table", name: "All" },
          { id: "v4", type: "calendar", name: "Calendar", payload: { calendarDateProp: "start" } },
          { id: "v5", type: "chart", name: "By theme", payload: { chartKind: "bar", chartXProp: "theme", chartAggregate: "count" } },
          { id: "v6", type: "dashboard", name: "Roadmap health", payload: { dashboardKPIs: ["confidence"], dashboardBreakdowns: ["horizon", "status"], dashboardRecentLimit: 10 } },
        ],
        seedRows: [
          { props: { name: "Notion-style date editor", horizon: "now", status: "shipped", start: "2026-05-01", end: "2026-05-14", owner: "Alex", confidence: 9 } },
          { props: { name: "Template gallery v2", horizon: "now", status: "building", start: "2026-05-13", end: "2026-05-30", owner: "Sam", confidence: 8 } },
          { props: { name: "Mobile native shell", horizon: "later", status: "scoping", start: "2026-07-01", end: "2026-09-30", owner: "Riya", confidence: 5 } },
        ],
      },
    ],
  },
};
