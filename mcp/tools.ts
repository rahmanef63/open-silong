/** Static tool registry. Mirrors `convex/mcp/http.ts:TOOL_LIST` —
 *  edit there first when adding tools, then mirror schema here.
 *
 *  Each entry exposes the JSON Schema for its `params` so MCP clients
 *  (Claude Desktop, Claude Code) can validate before calling. */

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

const stringParam = { type: "string" } as const;
const optionalString = { type: "string" } as const;
const numberParam = { type: "number" } as const;

export const TOOLS: ToolSpec[] = [
  {
    name: "nosion-search",
    description: "Full-text search across pages owned by the authenticated user. Returns Notion-shape page list.",
    inputSchema: {
      type: "object",
      properties: { query: stringParam, limit: numberParam },
      required: ["query"],
    },
  },
  {
    name: "nosion-list-pages",
    description: "List pages with cursor pagination. Optionally filter by parent_id or include trashed.",
    inputSchema: {
      type: "object",
      properties: {
        cursor: numberParam,
        page_size: numberParam,
        parent_id: { type: ["string", "null"] },
        include_trashed: { type: "boolean" },
      },
    },
  },
  {
    name: "nosion-list-databases",
    description: "List every database in the workspace. Returns Notion-shape database list.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "nosion-fetch",
    description: "Fetch any object (page or database) by id. Pages include their full block tree as `blocks` (Notion-shape).",
    inputSchema: { type: "object", properties: { id: stringParam }, required: ["id"] },
  },
  {
    name: "nosion-list-rows",
    description: "List rows of a database. Returns each row as a Notion page with the database's properties as the `properties` envelope.",
    inputSchema: {
      type: "object",
      properties: {
        database_id: stringParam,
        cursor: numberParam,
        page_size: numberParam,
      },
      required: ["database_id"],
    },
  },
  {
    name: "nosion-create-page",
    description: "Create a new page. Pass `parent_id` (page id) or omit for top-level. `children` is a Notion-shape blocks array (paragraph/heading/to_do/etc).",
    inputSchema: {
      type: "object",
      properties: {
        parent_id: { type: ["string", "null"] },
        title: optionalString,
        icon: optionalString,
        children: { type: "array", items: { type: "object" } },
      },
    },
  },
  {
    name: "nosion-update-page",
    description: "Patch page fields. Partial — only included fields change.",
    inputSchema: {
      type: "object",
      properties: {
        page_id: stringParam,
        title: optionalString,
        icon: optionalString,
        cover: { type: ["object", "string", "null"] },
        children: { type: "array", items: { type: "object" } },
      },
      required: ["page_id"],
    },
  },
  {
    name: "nosion-move-page",
    description: "Reparent a page. Pass `parent_id` (page id or null for top-level).",
    inputSchema: {
      type: "object",
      properties: {
        page_id: stringParam,
        parent_id: { type: ["string", "null"] },
      },
      required: ["page_id"],
    },
  },
  {
    name: "nosion-trash-page",
    description: "Soft-delete a page. Recoverable from trash for 30 days.",
    inputSchema: {
      type: "object",
      properties: { page_id: stringParam },
      required: ["page_id"],
    },
  },
  {
    name: "nosion-duplicate-page",
    description: "Deep-clone a page with fresh block ids. Title gets ' (copy)' suffix.",
    inputSchema: {
      type: "object",
      properties: { page_id: stringParam },
      required: ["page_id"],
    },
  },
  {
    name: "nosion-create-database",
    description: "Create a database. Properties default to a single Title column — patch via update-database.",
    inputSchema: {
      type: "object",
      properties: { title: optionalString, icon: optionalString },
    },
  },
  {
    name: "nosion-update-database",
    description: "Patch database title/icon. Properties array (Nosion-shape) accepted via `properties` for full schema replace.",
    inputSchema: {
      type: "object",
      properties: {
        database_id: stringParam,
        title: optionalString,
        icon: optionalString,
        properties: { type: "array", items: { type: "object" } },
      },
      required: ["database_id"],
    },
  },
  {
    name: "nosion-create-row",
    description: "Insert a row. `properties` is a Notion-shape map (e.g. `{ Status: { type: 'select', select: { id: 'opt1' } } }`). Property names that don't exist on the database are silently dropped.",
    inputSchema: {
      type: "object",
      properties: {
        database_id: stringParam,
        properties: { type: "object" },
      },
      required: ["database_id"],
    },
  },
  {
    name: "nosion-update-row",
    description: "Patch row properties. Partial merge — only included props change.",
    inputSchema: {
      type: "object",
      properties: {
        page_id: stringParam,
        properties: { type: "object" },
      },
      required: ["page_id"],
    },
  },
];
