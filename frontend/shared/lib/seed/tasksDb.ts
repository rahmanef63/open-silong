import type { Database, Page } from "@/shared/types/domain";
import { NOW } from "./profile";

export const TASKS_DB_ID = "db_tasks";
export const TASKS_NAME_PROP = "prop_name";
export const TASKS_STATUS_PROP = "prop_status";
export const TASKS_PRIORITY_PROP = "prop_priority";
export const TASKS_DUE_PROP = "prop_due";
export const TASKS_DONE_PROP = "prop_done";

const TASKS_VIEW_TABLE = "view_table";
const TASKS_VIEW_BOARD = "view_board";
const TASKS_VIEW_LIST = "view_list";
const TASKS_VIEW_GALLERY = "view_gallery";

export const TASK_ROW_IDS = ["row_t1", "row_t2", "row_t3", "row_t4", "row_t5"];

export function seedDatabases(): Database[] {
  return [
    {
      id: TASKS_DB_ID,
      name: "Tasks",
      icon: "✅",
      properties: [
        { id: TASKS_NAME_PROP, name: "Name", type: "text" },
        {
          id: TASKS_STATUS_PROP, name: "Status", type: "status",
          options: [
            { id: "opt_todo", name: "To do", color: "gray" },
            { id: "opt_doing", name: "In progress", color: "blue" },
            { id: "opt_done", name: "Done", color: "green" },
          ],
        },
        {
          id: TASKS_PRIORITY_PROP, name: "Priority", type: "select",
          options: [
            { id: "opt_low", name: "Low", color: "gray" },
            { id: "opt_med", name: "Medium", color: "yellow" },
            { id: "opt_high", name: "High", color: "red" },
          ],
        },
        { id: TASKS_DUE_PROP, name: "Due", type: "date" },
        { id: TASKS_DONE_PROP, name: "Complete", type: "checkbox" },
      ],
      rowIds: TASK_ROW_IDS,
      views: [
        { id: TASKS_VIEW_TABLE, name: "All", type: "table", sorts: [], filters: [], search: "" },
        { id: TASKS_VIEW_BOARD, name: "Board", type: "board", groupBy: TASKS_STATUS_PROP, sorts: [], filters: [], search: "" },
        { id: TASKS_VIEW_LIST, name: "List", type: "list", sorts: [], filters: [], search: "" },
        { id: TASKS_VIEW_GALLERY, name: "Gallery", type: "gallery", sorts: [], filters: [], search: "" },
      ],
      activeViewId: TASKS_VIEW_TABLE,
      createdAt: NOW - 1000 * 60 * 60 * 24 * 4,
      updatedAt: NOW - 1000 * 60 * 30,
    },
  ];
}

export function taskRow(idStr: string, name: string, status: string, priority: string, due: string, done: boolean, createdAgo: number): Page {
  return {
    id: idStr, parentId: null, title: name, icon: "📌",
    blocks: [{ id: idStr + "_b", type: "paragraph", text: `Notes about ${name.toLowerCase()}.` }],
    favorite: false, trashed: false,
    createdAt: NOW - createdAgo, updatedAt: NOW - createdAgo / 2,
    rowOfDatabaseId: TASKS_DB_ID,
    rowProps: {
      [TASKS_NAME_PROP]: name,
      [TASKS_STATUS_PROP]: status,
      [TASKS_PRIORITY_PROP]: priority,
      [TASKS_DUE_PROP]: { date: due },
      [TASKS_DONE_PROP]: done,
    },
  };
}
