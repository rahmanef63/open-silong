import type { Database, DatabaseTemplate, DatabaseViewConfig, Property } from "@/shared/types/domain";

const uid = () => Math.random().toString(36).slice(2, 10);

export interface DatabasePreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  build: () => {
    name: string;
    icon: string;
    properties: Property[];
    views: DatabaseViewConfig[];
    activeViewId: string;
    rowIds: string[];
    templates?: DatabaseTemplate[];
    defaultTemplateId?: string | null;
  } & Partial<Database>;
}

export const TASK_PRESET: DatabasePreset = {
  id: "tasks",
  name: "Tasks",
  icon: "✅",
  description: "Status, priority, due date, sprint — Notion-style task DB with 4 default views.",
  build: () => {
    const titleProp: Property = { id: uid(), name: "Task", type: "text" };
    const statusProp: Property = {
      id: uid(), name: "Status", type: "status",
      options: [
        { id: uid(), name: "Backlog", color: "gray" },
        { id: uid(), name: "Todo", color: "yellow" },
        { id: uid(), name: "In progress", color: "blue" },
        { id: uid(), name: "In review", color: "purple" },
        { id: uid(), name: "Done", color: "green" },
        { id: uid(), name: "Blocked", color: "red" },
      ],
    };
    const priorityProp: Property = {
      id: uid(), name: "Priority", type: "select",
      options: [
        { id: uid(), name: "Low", color: "gray" },
        { id: uid(), name: "Medium", color: "yellow" },
        { id: uid(), name: "High", color: "orange" },
        { id: uid(), name: "Urgent", color: "red" },
      ],
    };
    const dueProp: Property = { id: uid(), name: "Due", type: "date" };
    const assigneeProp: Property = { id: uid(), name: "Assignee", type: "person" };
    const tagsProp: Property = { id: uid(), name: "Tags", type: "multi_select", options: [] };
    const idProp: Property = { id: uid(), name: "ID", type: "unique_id", uniqueIdPrefix: "TASK" };
    const createdProp: Property = { id: uid(), name: "Created", type: "created_time" };

    const boardView: DatabaseViewConfig = {
      id: uid(), name: "Board", type: "board",
      groupBy: statusProp.id, sorts: [], filters: [], search: "",
    };
    const myTasksView: DatabaseViewConfig = {
      id: uid(), name: "My tasks", type: "table",
      sorts: [{ propertyId: dueProp.id, direction: "asc" }],
      filters: [{ propertyId: statusProp.id, op: "not_empty" }],
      search: "",
    };
    const calendarView: DatabaseViewConfig = {
      id: uid(), name: "Calendar", type: "calendar",
      sorts: [], filters: [], search: "",
    };
    const tableView: DatabaseViewConfig = {
      id: uid(), name: "All", type: "table",
      sorts: [], filters: [], search: "",
    };

    const tplTask: DatabaseTemplate = {
      id: uid(), name: "Task", icon: "✅",
      blocks: [
        { id: uid(), type: "h2", text: "Goal" },
        { id: uid(), type: "paragraph", text: "" },
        { id: uid(), type: "h2", text: "Acceptance criteria" },
        { id: uid(), type: "todo", text: "", checked: false },
        { id: uid(), type: "h2", text: "Notes" },
        { id: uid(), type: "paragraph", text: "" },
      ],
    };
    const tplBug: DatabaseTemplate = {
      id: uid(), name: "Bug", icon: "🐛",
      blocks: [
        { id: uid(), type: "h2", text: "Steps to reproduce" },
        { id: uid(), type: "numbered", text: "" },
        { id: uid(), type: "h2", text: "Expected" },
        { id: uid(), type: "paragraph", text: "" },
        { id: uid(), type: "h2", text: "Actual" },
        { id: uid(), type: "paragraph", text: "" },
      ],
      rowProps: { [priorityProp.id]: priorityProp.options![2].id },
    };

    return {
      name: "Tasks",
      icon: "✅",
      properties: [titleProp, statusProp, priorityProp, dueProp, assigneeProp, tagsProp, idProp, createdProp],
      rowIds: [],
      views: [boardView, myTasksView, calendarView, tableView],
      activeViewId: boardView.id,
      templates: [tplTask, tplBug],
      defaultTemplateId: tplTask.id,
    };
  },
};

export const SPRINT_PRESET: DatabasePreset = {
  id: "sprints",
  name: "Sprints",
  icon: "🏃",
  description: "Sprint cycle DB with start / end / goal / status.",
  build: () => {
    const titleProp: Property = { id: uid(), name: "Sprint", type: "text" };
    const statusProp: Property = {
      id: uid(), name: "Status", type: "status",
      options: [
        { id: uid(), name: "Planning", color: "gray" },
        { id: uid(), name: "Active", color: "green" },
        { id: uid(), name: "Closed", color: "blue" },
      ],
    };
    const startProp: Property = { id: uid(), name: "Start", type: "date" };
    const endProp: Property = { id: uid(), name: "End", type: "date" };
    const goalProp: Property = { id: uid(), name: "Goal", type: "text" };
    const idProp: Property = { id: uid(), name: "ID", type: "unique_id", uniqueIdPrefix: "SPRINT" };

    const tableView: DatabaseViewConfig = {
      id: uid(), name: "All sprints", type: "table",
      sorts: [{ propertyId: startProp.id, direction: "desc" }], filters: [], search: "",
    };
    const timelineView: DatabaseViewConfig = {
      id: uid(), name: "Timeline", type: "timeline",
      sorts: [], filters: [], search: "",
    };

    return {
      name: "Sprints",
      icon: "🏃",
      properties: [titleProp, statusProp, startProp, endProp, goalProp, idProp],
      rowIds: [],
      views: [tableView, timelineView],
      activeViewId: tableView.id,
    };
  },
};

export const PROJECT_PRESET: DatabasePreset = {
  id: "projects",
  name: "Projects",
  icon: "🚀",
  description: "Project DB with owner, priority, health, dates.",
  build: () => {
    const titleProp: Property = { id: uid(), name: "Project", type: "text" };
    const statusProp: Property = {
      id: uid(), name: "Status", type: "status",
      options: [
        { id: uid(), name: "Idea", color: "gray" },
        { id: uid(), name: "Planned", color: "blue" },
        { id: uid(), name: "In progress", color: "yellow" },
        { id: uid(), name: "Done", color: "green" },
        { id: uid(), name: "Archived", color: "purple" },
      ],
    };
    const healthProp: Property = {
      id: uid(), name: "Health", type: "select",
      options: [
        { id: uid(), name: "On track", color: "green" },
        { id: uid(), name: "At risk", color: "yellow" },
        { id: uid(), name: "Off track", color: "red" },
      ],
    };
    const ownerProp: Property = { id: uid(), name: "Owner", type: "person" };
    const startProp: Property = { id: uid(), name: "Start", type: "date" };
    const endProp: Property = { id: uid(), name: "Target", type: "date" };
    const idProp: Property = { id: uid(), name: "ID", type: "unique_id", uniqueIdPrefix: "PRJ" };

    const boardView: DatabaseViewConfig = {
      id: uid(), name: "Board", type: "board",
      groupBy: statusProp.id, sorts: [], filters: [], search: "",
    };
    const tableView: DatabaseViewConfig = {
      id: uid(), name: "All", type: "table",
      sorts: [], filters: [], search: "",
    };

    return {
      name: "Projects",
      icon: "🚀",
      properties: [titleProp, statusProp, healthProp, ownerProp, startProp, endProp, idProp],
      rowIds: [],
      views: [boardView, tableView],
      activeViewId: boardView.id,
    };
  },
};

export const DATABASE_PRESETS: DatabasePreset[] = [TASK_PRESET, SPRINT_PRESET, PROJECT_PRESET];
