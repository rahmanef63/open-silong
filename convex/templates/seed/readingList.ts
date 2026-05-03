import type { TemplateJson } from "../lib/validate";

export const readingList: TemplateJson = {
  version: 1,
  name: "Reading List",
  icon: "📚",
  category: "Personal",
  description: "Track books to read, currently reading, and finished — with rating.",
  page: {
    ref: "root",
    title: "Reading List",
    icon: "📚",
    blocks: [
      { type: "h1", text: "Reading list" },
      { type: "paragraph", text: "Drop a book in here whenever you find one." },
      { type: "database", databaseRef: "books" },
    ],
    databases: [
      {
        ref: "books",
        name: "Books",
        icon: "📖",
        properties: [
          { id: "title", name: "Title", type: "text" },
          { id: "author", name: "Author", type: "text" },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "todo", name: "To read", color: "gray" },
              { id: "doing", name: "Reading", color: "blue" },
              { id: "done", name: "Finished", color: "green" },
            ],
          },
          { id: "rating", name: "Rating", type: "number" },
          { id: "url", name: "Link", type: "url" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By status", groupBy: "status" },
        ],
        seedRows: [
          { props: { title: "The Pragmatic Programmer", author: "Hunt & Thomas", status: "done", rating: 5 } },
          { props: { title: "Designing Data-Intensive Applications", author: "Kleppmann", status: "doing" } },
        ],
      },
    ],
  },
};
