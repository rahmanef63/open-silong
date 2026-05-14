import type { TemplateJson } from "../lib/validate";

/** Podcast Library — Episodes + Shows + Notes. */
export const podcastLibrary: TemplateJson = {
  version: 1,
  name: "Podcast Library",
  icon: "🎧",
  category: "Media",
  description: "Subscribed shows, episode queue, listen progress, and quote highlights w/ timestamps.",
  page: {
    ref: "root",
    title: "Podcast Library",
    icon: "🎧",
    blocks: [
      { type: "h1", text: "🎧 Podcast Library" },
      { type: "callout", text: "Episodes feed straight into Queue. Highlights store quotes w/ timestamps and link back to the episode." },
      {
        type: "columns3",
        columns: [
          [{ type: "callout", text: "**Queue**\nNext up — sort by added." }],
          [{ type: "callout", text: "**Listening**\nIn-progress only." }],
          [{ type: "callout", text: "**Done**\nNotes + rating." }],
        ],
      },
      { type: "h2", text: "📻 Shows" },
      { type: "database", databaseRef: "shows" },
      { type: "h2", text: "🎙️ Episodes + highlights" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Episodes" }, { type: "database", databaseRef: "episodes" }],
          [{ type: "h3", text: "Highlights" }, { type: "database", databaseRef: "highlights" }],
        ],
      },
    ],
    databases: [
      {
        ref: "shows",
        name: "Shows",
        icon: "📻",
        properties: [
          { id: "name", name: "Show", type: "text" },
          { id: "host", name: "Host", type: "text" },
          {
            id: "category",
            name: "Category",
            type: "select",
            options: [
              { id: "tech", name: "Tech", color: "blue" },
              { id: "business", name: "Business", color: "green" },
              { id: "design", name: "Design", color: "purple" },
              { id: "history", name: "History", color: "orange" },
              { id: "comedy", name: "Comedy", color: "yellow" },
            ],
          },
          { id: "rss", name: "RSS", type: "url" },
          { id: "rating", name: "Rating 1-5", type: "number" },
        ],
        views: [
          { id: "v1", type: "gallery", name: "Shows", isDefault: true },
          { id: "v2", type: "table", name: "Table" },
          { id: "v3", type: "board", name: "By category", groupBy: "category" },
        ],
        seedRows: [
          { props: { name: "Acquired", host: "Ben & David", category: "business", rating: 5 } },
          { props: { name: "Lex Fridman Pod", host: "Lex Fridman", category: "tech", rating: 4 } },
          { props: { name: "99% Invisible", host: "Roman Mars", category: "design", rating: 5 } },
        ],
      },
      {
        ref: "episodes",
        name: "Episodes",
        icon: "🎙️",
        properties: [
          { id: "name", name: "Episode", type: "text" },
          { id: "show", name: "Show", type: "relation", relationDatabaseRef: "shows" },
          { id: "released", name: "Released", type: "date" },
          { id: "minutes", name: "Length (m)", type: "number" },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "queue", name: "Queue", color: "gray" },
              { id: "listening", name: "Listening", color: "blue" },
              { id: "done", name: "Done", color: "green" },
              { id: "skipped", name: "Skipped", color: "red" },
            ],
          },
          { id: "rating", name: "Rating 1-5", type: "number" },
          { id: "notes", name: "Notes", type: "text" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "Queue board", groupBy: "status" },
          { id: "v3", type: "calendar", name: "Released", payload: { calendarDateProp: "released" } },
          { id: "v4", type: "feed", name: "Recent", payload: { feedTimestamp: "createdAt" } },
          { id: "v5", type: "chart", name: "Per show", payload: { chartKind: "bar", chartXProp: "show", chartAggregate: "count" } },
        ],
        seedRows: [
          { props: { name: "TSMC, Part 1", released: "2025-04-12", minutes: 240, status: "done", rating: 5 } },
          { props: { name: "Stripe, Part 2", released: "2025-09-20", minutes: 230, status: "listening" } },
        ],
      },
      {
        ref: "highlights",
        name: "Highlights",
        icon: "💡",
        properties: [
          { id: "name", name: "Quote / idea", type: "text" },
          { id: "episode", name: "Episode", type: "relation", relationDatabaseRef: "episodes" },
          { id: "timestamp", name: "Timestamp", type: "text" },
          {
            id: "tag",
            name: "Tag",
            type: "multi_select",
            options: [
              { id: "strategy", name: "Strategy", color: "blue" },
              { id: "history", name: "History", color: "orange" },
              { id: "ops", name: "Ops", color: "green" },
              { id: "people", name: "People", color: "purple" },
            ],
          },
        ],
        views: [
          { id: "v1", type: "list", name: "List", isDefault: true },
          { id: "v2", type: "board", name: "By tag", groupBy: "tag" },
        ],
        seedRows: [
          { props: { name: "TSMC dedicated foundry idea", timestamp: "01:14:22", tag: ["strategy", "history"] } },
        ],
      },
    ],
  },
};
