import { Database, Page, Preferences, UserProfile, Workspace } from "./types";

export const seedWorkspace: Workspace = {
  id: "ws_demo",
  name: "Acme Studio",
  emoji: "🪐",
};

export const seedUser: UserProfile = {
  id: "user_me",
  name: "Alex Rivera",
  email: "alex@acme.studio",
  bio: "Designer & maker. Likes long walks and short meetings.",
  icon: "🦊",
  color: "24 90% 56%",
};

export const seedPreferences: Preferences = {
  theme: "light",
  sidebarDensity: "comfortable",
  defaultPageSort: "manual",
  editorBehavior: "default",
  landingView: "dashboard",
  lastOpenedPageId: null,
};

const now = Date.now();
const id = (n: string) => `seed_${n}`;

const TASKS_DB_ID = "db_tasks";
const TASKS_NAME_PROP = "prop_name";
const TASKS_STATUS_PROP = "prop_status";
const TASKS_PRIORITY_PROP = "prop_priority";
const TASKS_DUE_PROP = "prop_due";
const TASKS_DONE_PROP = "prop_done";
const TASKS_VIEW_TABLE = "view_table";
const TASKS_VIEW_BOARD = "view_board";
const TASKS_VIEW_LIST = "view_list";
const TASKS_VIEW_GALLERY = "view_gallery";

const TASK_ROW_IDS = ["row_t1", "row_t2", "row_t3", "row_t4", "row_t5"];

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
      createdAt: now - 1000 * 60 * 60 * 24 * 4,
      updatedAt: now - 1000 * 60 * 30,
    },
  ];
}

function row(idStr: string, name: string, status: string, priority: string, due: string, done: boolean, createdAgo: number): Page {
  return {
    id: idStr, parentId: null, title: name, icon: "📌",
    blocks: [{ id: idStr + "_b", type: "paragraph", text: `Notes about ${name.toLowerCase()}.` }],
    favorite: false, trashed: false,
    createdAt: now - createdAgo, updatedAt: now - createdAgo / 2,
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

export function seedPages(): Page[] {
  return [
    {
      id: id("getting-started"),
      parentId: null,
      title: "Getting Started",
      icon: "👋",
      cover: "linear-gradient(135deg, hsl(24 90% 70%), hsl(340 80% 70%))",
      favorite: true,
      trashed: false,
      createdAt: now - 1000 * 60 * 60 * 24 * 7,
      updatedAt: now - 1000 * 60 * 60,
      blocks: [
        { id: "b1", type: "h1", text: "Welcome to your workspace" },
        { id: "b2", type: "paragraph", text: "This is a quiet, focused place to think, write and ship. Use the sidebar to navigate, press / inside any block for the slash menu." },
        { id: "b3", type: "callout", text: "Tip: press ⌘K (or Ctrl K) to search across every page." },
        { id: "b4", type: "h2", text: "Try these things" },
        { id: "b5", type: "todo", text: "Click a block and press / to insert headings, todos, code", checked: true },
        { id: "b6", type: "todo", text: "Drag the • handle on the left to reorder blocks", checked: false },
        { id: "b7", type: "todo", text: "Star a page to pin it to Favorites", checked: false },
        { id: "b8", type: "divider", text: "" },
        { id: "b9", type: "quote", text: "Simplicity is the ultimate sophistication. — da Vinci" },
      ],
    },
    {
      id: id("projects"),
      parentId: null,
      title: "Projects",
      icon: "🚀",
      favorite: true,
      trashed: false,
      createdAt: now - 1000 * 60 * 60 * 24 * 5,
      updatedAt: now - 1000 * 60 * 60 * 2,
      blocks: [
        { id: "p1", type: "h1", text: "Projects" },
        { id: "p2", type: "paragraph", text: "An overview of what's in flight this quarter." },
        { id: "p3", type: "h3", text: "Current focus" },
        { id: "p4", type: "bullet", text: "Launch the marketing site refresh" },
        { id: "p5", type: "bullet", text: "Ship onboarding v2 with sample workspaces" },
        { id: "p6", type: "bullet", text: "Performance audit across editor surfaces" },
        { id: "p7", type: "h2", text: "Task tracker" },
        { id: "p8", type: "database", text: "", databaseId: TASKS_DB_ID },
      ],
    },
    {
      id: id("orbit"),
      parentId: id("projects"),
      title: "Orbit – marketing site",
      icon: "🛰️",
      favorite: false,
      trashed: false,
      createdAt: now - 1000 * 60 * 60 * 24 * 4,
      updatedAt: now - 1000 * 60 * 30,
      blocks: [
        { id: "o1", type: "h1", text: "Orbit" },
        { id: "o2", type: "paragraph", text: "A new marketing site that explains the product in 30 seconds." },
        { id: "o3", type: "h3", text: "Milestones" },
        { id: "o4", type: "todo", text: "Brand exploration", checked: true },
        { id: "o5", type: "todo", text: "Hero section copy", checked: true },
        { id: "o6", type: "todo", text: "Pricing page", checked: false },
        { id: "o7", type: "todo", text: "Launch", checked: false },
        { id: "o8", type: "code", text: "npm run deploy --env=production", lang: "bash" },
      ],
    },
    {
      id: id("onboarding"),
      parentId: id("projects"),
      title: "Onboarding v2",
      icon: "🪄",
      favorite: false,
      trashed: false,
      createdAt: now - 1000 * 60 * 60 * 24 * 3,
      updatedAt: now - 1000 * 60 * 60 * 6,
      blocks: [
        { id: "n1", type: "h1", text: "Onboarding v2" },
        { id: "n2", type: "quote", text: "First impressions decide whether the second one happens." },
        { id: "n3", type: "paragraph", text: "We replace the empty workspace with a curated starter that shows the best the product has to offer." },
      ],
    },
    {
      id: id("notes"),
      parentId: null,
      title: "Notes",
      icon: "📚",
      favorite: false,
      trashed: false,
      createdAt: now - 1000 * 60 * 60 * 24 * 2,
      updatedAt: now - 1000 * 60 * 10,
      blocks: [
        { id: "x1", type: "h1", text: "Notes" },
        { id: "x2", type: "paragraph", text: "Stray thoughts and reading highlights." },
        { id: "x3", type: "bullet", text: "Read: Designing for the long term" },
        { id: "x4", type: "bullet", text: "Watch: How small teams ship faster" },
      ],
    },
    {
      id: id("reading"),
      parentId: id("notes"),
      title: "Reading list",
      icon: "📖",
      favorite: false,
      trashed: false,
      createdAt: now - 1000 * 60 * 60 * 24,
      updatedAt: now - 1000 * 60 * 5,
      blocks: [
        { id: "r1", type: "h1", text: "Reading list" },
        { id: "r2", type: "todo", text: "The Beginning of Infinity – Deutsch", checked: false },
        { id: "r3", type: "todo", text: "Working in Public – Eghbal", checked: true },
      ],
    },
    // Database rows (each is a Page with rowOfDatabaseId)
    row("row_t1", "Brand exploration", "opt_done", "opt_med", "2026-04-15", true, 1000 * 60 * 60 * 24 * 6),
    row("row_t2", "Pricing page draft", "opt_doing", "opt_high", "2026-05-02", false, 1000 * 60 * 60 * 24 * 3),
    row("row_t3", "Hero copy revisions", "opt_doing", "opt_med", "2026-05-04", false, 1000 * 60 * 60 * 24 * 2),
    row("row_t4", "Launch checklist", "opt_todo", "opt_high", "2026-05-10", false, 1000 * 60 * 60 * 24 * 1),
    row("row_t5", "Post-launch retro", "opt_todo", "opt_low", "2026-05-20", false, 1000 * 60 * 60 * 12),
  ];
}
