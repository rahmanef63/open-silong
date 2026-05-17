import type { TplDatabaseT } from "../../../lib/validate";

/** Notes — text-first knowledge dump w/ gallery + feed views.
 *  Demos created_time / last_edited_time / created_by system props. */
export const notesDb: TplDatabaseT = {
  ref: "notes",
  name: "Notes",
  icon: "📝",
  properties: [
    { id: "name", name: "Title", type: "text" },
    {
      id: "category", name: "Category", type: "select",
      options: [
        { id: "idea", name: "Idea", color: "yellow" },
        { id: "ref", name: "Reference", color: "blue" },
        { id: "journal", name: "Journal", color: "purple" },
        { id: "todo", name: "TODO", color: "gray" },
      ],
    },
    { id: "starred", name: "Starred", type: "checkbox" },
    { id: "created", name: "Created", type: "created_time" },
    { id: "updated", name: "Updated", type: "last_edited_time" },
    { id: "createdBy", name: "Author", type: "created_by" },
  ],
  views: [
    { id: "v1", type: "table", name: "All notes", isDefault: true },
    { id: "v2", type: "gallery", name: "Gallery" },
    { id: "v3", type: "feed", name: "Latest", payload: { feedTimestamp: "updated" } },
  ],
};
