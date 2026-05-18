/** Skill catalog for the AI chat agent — OpenAI-function-tools schema.
 *
 *  Each entry declares one tool the LLM can call. The `kind` field
 *  decides what happens server-side:
 *    - "query"    → server runs the matching handler in skillHandlers.ts
 *                   and feeds the JSON result back into the conversation
 *                   so the model can chain (list pages → pick id → read).
 *    - "mutation" → returned to the client unexecuted for user approval
 *                   (NOT YET WIRED — placeholder for the future approval
 *                   UI port).
 *
 *  Tool name uses `_` separators because OpenAI function names disallow
 *  dots. Map back to skill id via underscoreToDot at dispatch time.
 */

export type SkillKind = "query" | "mutation";

export interface Skill {
  id: string;
  kind: SkillKind;
  toolName: string; // dot→underscore (e.g. "pages_list")
  description: string;
  parameters: Record<string, unknown>;
}

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object" as const,
  properties,
  required,
  additionalProperties: false,
});

export const SKILL_CATALOG: Skill[] = [
  {
    id: "pages.list",
    kind: "query",
    toolName: "pages_list",
    description: "List all pages in the current workspace. Returns id, title, icon, parentId, updatedAt. Use this to find a page id before reading or referencing it.",
    parameters: obj({}),
  },
  {
    id: "pages.get",
    kind: "query",
    toolName: "pages_get",
    description: "Read one page's full content (title, blocks). Pass the pageId from pages_list. Returns the block array — use it to summarize, extract, or answer questions about the page.",
    parameters: obj({
      pageId: { type: "string", description: "Page id from pages_list" },
    }, ["pageId"]),
  },
  {
    id: "pages.search",
    kind: "query",
    toolName: "pages_search",
    description: "Full-text search across the user's pages by title + body. Use BEFORE pages_get when the user references a page by topic instead of id. Returns up to 20 matches with id + title + snippet.",
    parameters: obj({
      query: { type: "string", description: "Search query (1-200 chars)" },
    }, ["query"]),
  },
  {
    id: "databases.list",
    kind: "query",
    toolName: "databases_list",
    description: "List all databases in the workspace. Returns id, name, icon, property names. Use before databases_rows when you need to query data.",
    parameters: obj({}),
  },
  {
    id: "databases.rows",
    kind: "query",
    toolName: "databases_rows",
    description: "Read rows of a database. Pass dbId from databases_list. Returns up to 50 rows with their title + property values flattened.",
    parameters: obj({
      dbId: { type: "string", description: "Database id from databases_list" },
    }, ["dbId"]),
  },
  // ─── Write skills ──────────────────────────────────────────
  {
    id: "pages.append_markdown",
    kind: "mutation",
    toolName: "pages_append_markdown",
    description: "Append markdown content (headings, lists, tables, todos, callouts) to the END of a page. Use when the user says 'add to this page', 'write here', 'tambahkan ke halaman ini', etc. Pass the activePageId from USER_CONTEXT when the user refers to 'this page'. Markdown is parsed into proper blocks.",
    parameters: obj({
      pageId: { type: "string", description: "Target page id (use activePageId for 'this page')" },
      markdown: { type: "string", description: "Markdown content to append. Multi-paragraph + headings supported." },
    }, ["pageId", "markdown"]),
  },
  {
    id: "pages.create",
    kind: "mutation",
    toolName: "pages_create",
    description: "Create a new empty page under the active workspace. Optional parentId nests it. Returns the new pageId so the next call can fill it (typically pages_append_markdown).",
    parameters: obj({
      title: { type: "string", description: "Page title" },
      parentId: { type: "string", description: "Optional parent pageId (use activePageId to nest under current)" },
      icon: { type: "string", description: "Optional emoji icon (e.g. 🥗)" },
    }, ["title"]),
  },
  {
    id: "pages.set_title",
    kind: "mutation",
    toolName: "pages_set_title",
    description: "Rename a page. Use for the active page when the user asks to rename.",
    parameters: obj({
      pageId: { type: "string" },
      title: { type: "string" },
    }, ["pageId", "title"]),
  },
  {
    id: "pages.set_icon",
    kind: "mutation",
    toolName: "pages_set_icon",
    description: "Set a page's emoji icon.",
    parameters: obj({
      pageId: { type: "string" },
      icon: { type: "string", description: "A single emoji" },
    }, ["pageId", "icon"]),
  },
];

export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(
  SKILL_CATALOG.map((s) => [s.id, s]),
);

export const SKILL_BY_TOOL_NAME: Record<string, Skill> = Object.fromEntries(
  SKILL_CATALOG.map((s) => [s.toolName, s]),
);

/** Convert skill catalog to OpenAI tools[] payload. */
export function toolsForLLM() {
  return SKILL_CATALOG.map((s) => ({
    type: "function" as const,
    function: {
      name: s.toolName,
      description: s.description,
      parameters: s.parameters,
    },
  }));
}
