import type { TplDatabaseT } from "../../../lib/validate";

/** Reading list — gallery covers + board + chart by genre. */
export const readingDb: TplDatabaseT = {
  ref: "reading",
  name: "Reading List",
  icon: "📚",
  properties: [
    { id: "name", name: "Title", type: "text" },
    { id: "author", name: "Author", type: "text" },
    {
      id: "status", name: "Status", type: "status",
      options: [
        { id: "toread", name: "To read", color: "gray" },
        { id: "reading", name: "Reading", color: "blue" },
        { id: "read", name: "Read", color: "green" },
        { id: "skip", name: "Skipped", color: "red" },
      ],
    },
    { id: "rating", name: "Rating", type: "number" },
    { id: "cover", name: "Cover", type: "files" },
    { id: "url", name: "Link", type: "url" },
    {
      id: "genre", name: "Genre", type: "multi_select",
      options: [
        { id: "fiction", name: "Fiction", color: "purple" },
        { id: "biz", name: "Business", color: "blue" },
        { id: "sci", name: "Science", color: "green" },
        { id: "self", name: "Self-improvement", color: "yellow" },
        { id: "tech", name: "Tech", color: "red" },
      ],
    },
    { id: "started", name: "Started", type: "date" },
    { id: "finished", name: "Finished", type: "date" },
  ],
  views: [
    { id: "v1", type: "gallery", name: "Covers", isDefault: true },
    { id: "v2", type: "board", name: "By status", groupBy: "status" },
    { id: "v3", type: "list", name: "List" },
    { id: "v4", type: "chart", name: "By genre", payload: { chartKind: "donut", chartXProp: "genre", chartYProp: "name", chartAggregate: "count" } },
  ],
};
