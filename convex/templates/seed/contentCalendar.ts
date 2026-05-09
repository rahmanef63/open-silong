import type { TemplateJson } from "../lib/validate";

/** Content Calendar — marketing pipeline w/ ideas → drafts → published.
 *
 *  Single-database template w/ 5 views (table, board, calendar, chart,
 *  dashboard) — proves a single content table can power an entire
 *  editorial workflow. Heavy column use on the dashboard page. */
export const contentCalendar: TemplateJson = {
  version: 1,
  name: "Content Calendar",
  icon: "📅",
  category: "Marketing",
  description: "Editorial calendar w/ kanban + monthly calendar + KPI dashboard.",
  page: {
    ref: "root",
    title: "Content Calendar",
    icon: "📅",
    blocks: [
      { type: "h1", text: "📅 Content Calendar" },
      { type: "callout", text: "One source of truth for every piece of content. Pipeline kanban on the left, monthly calendar on the right." },

      { type: "h2", text: "🎯 Workflow" },
      {
        type: "columns3",
        columns: [
          [
            { type: "h3", text: "1. Ideate" },
            { type: "paragraph", text: "Drop ideas in the table. No editing yet — quantity over quality." },
          ],
          [
            { type: "h3", text: "2. Draft" },
            { type: "paragraph", text: "Move idea → Drafting in the kanban. Open the row page to write." },
          ],
          [
            { type: "h3", text: "3. Ship" },
            { type: "paragraph", text: "Set Status = Published, Published date. Calendar view shows your cadence." },
          ],
        ],
      },

      { type: "h2", text: "📆 Pipeline + Calendar" },
      {
        type: "columns2",
        columns: [
          [
            { type: "h3", text: "Pipeline" },
            { type: "callout", text: "Drag cards left → right as they progress." },
            { type: "database", databaseRef: "content" },
          ],
          [
            { type: "h3", text: "This month" },
            { type: "callout", text: "Switch the embedded view to Calendar to see scheduled pieces." },
          ],
        ],
      },

      { type: "h2", text: "📊 Performance dashboard" },
      { type: "callout", text: "Open the database → switch to the Dashboard view for KPIs by status + format." },
    ],
    databases: [
      {
        ref: "content",
        name: "Content pieces",
        icon: "✏️",
        properties: [
          { id: "title", name: "Title", type: "text" },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "idea", name: "Idea", color: "gray" },
              { id: "drafting", name: "Drafting", color: "blue" },
              { id: "review", name: "In review", color: "purple" },
              { id: "scheduled", name: "Scheduled", color: "orange" },
              { id: "published", name: "Published", color: "green" },
            ],
          },
          {
            id: "format",
            name: "Format",
            type: "select",
            options: [
              { id: "blog", name: "Blog post", color: "blue" },
              { id: "video", name: "Video", color: "red" },
              { id: "social", name: "Social", color: "pink" },
              { id: "newsletter", name: "Newsletter", color: "yellow" },
              { id: "podcast", name: "Podcast", color: "purple" },
            ],
          },
          {
            id: "channel",
            name: "Channel",
            type: "multi_select",
            options: [
              { id: "blog", name: "Blog", color: "blue" },
              { id: "yt", name: "YouTube", color: "red" },
              { id: "x", name: "X", color: "gray" },
              { id: "li", name: "LinkedIn", color: "blue" },
              { id: "ig", name: "Instagram", color: "pink" },
            ],
          },
          { id: "publishDate", name: "Publish date", type: "date" },
          { id: "owner", name: "Owner", type: "text" },
          { id: "views", name: "Views", type: "number" },
          { id: "url", name: "Link", type: "url" },
        ],
        views: [
          { id: "v1", type: "table", name: "All pieces", isDefault: true },
          { id: "v2", type: "board", name: "Pipeline", groupBy: "status" },
          {
            id: "v3", type: "calendar", name: "Calendar",
            payload: { calendarDateProp: "publishDate", calendarMode: "month", calendarShowWeekends: true },
          },
          {
            id: "v4", type: "chart", name: "By format",
            payload: { chartKind: "donut", chartXProp: "format", chartAggregate: "count", chartShowLegend: true },
          },
          {
            id: "v5", type: "dashboard", name: "Performance",
            payload: { dashboardKPIs: ["views"], dashboardBreakdowns: ["status", "format"], dashboardRecentLimit: 8 },
          },
          { id: "v6", type: "gallery", name: "Cards", payload: { gallerySize: "medium" } },
        ],
        seedRows: [
          { props: { title: "Why Cache Components matter", status: "drafting", format: "blog", channel: ["blog", "li"], publishDate: "2026-05-15", owner: "Alex", views: 0 } },
          { props: { title: "5 lessons shipping a Notion clone", status: "scheduled", format: "blog", channel: ["blog", "x"], publishDate: "2026-05-20", owner: "Sam", views: 0 } },
          { props: { title: "Walkthrough: building a CRM in 1 hour", status: "published", format: "video", channel: ["yt"], publishDate: "2026-05-01", owner: "Riya", views: 4200 } },
          { props: { title: "Newsletter — May edition", status: "review", format: "newsletter", channel: ["blog"], publishDate: "2026-05-12", owner: "Sam", views: 0 } },
          { props: { title: "Idea: comparison post vs Notion", status: "idea", format: "blog", channel: [], owner: "Alex", views: 0 } },
        ],
      },
    ],
  },
};
