import type { Database } from "@/shared/types/domain";
import type { DatabaseExportV1, AIRowDraft } from "./serialize";

const KEY_STORAGE = "notion-clone:anthropic-api-key";
const MODEL_STORAGE = "notion-clone:anthropic-model";
const DEFAULT_MODEL = "claude-sonnet-4-6";

export const getApiKey = (): string => {
  try { return localStorage.getItem(KEY_STORAGE) ?? ""; } catch { return ""; }
};
export const setApiKey = (k: string): void => {
  try { localStorage.setItem(KEY_STORAGE, k); } catch { /* ignore */ }
};
export const getModel = (): string => {
  try { return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL; } catch { return DEFAULT_MODEL; }
};
export const setModel = (m: string): void => {
  try { localStorage.setItem(MODEL_STORAGE, m); } catch { /* ignore */ }
};

/* ============================================================
 * Prompts
 * ============================================================ */

const SCHEMA_RULES = `# Property types
text, number, select, multi_select, status, date, person, checkbox,
url, email, phone, files, relation, rollup, formula,
created_time, created_by, last_edited_time, last_edited_by, unique_id.

For select / multi_select / status: include options: [{id, name, color}].
Colors: gray, brown, orange, yellow, green, blue, purple, pink, red, default.

For formula: include "formulaExpression". Supported:
- Refs: {{title}}, {{Property name}}
- Math: =1+2, ={{Score}} * 2
- Logic: if(cond, then, else), and, or, not, empty
- String: concat, contains, replace, lower, upper, length, substring(s,start,len)
- Number: round, floor, ceil, abs, min, max
- Date: now, today, dateAdd(d,n,"day"|"week"|"month"|"year"), dateSubtract,
        dateBetween(a,b,"day"), formatDate(d,"DD/MM/YYYY")
- List (over multi_select / relation): count, sum, join(list, sep)
Quote string literals with double quotes. Use {{property name}} for references.

For rollup: rollupRelationPropertyId + rollupTargetPropertyId + rollupAggregate
(count | count_unique | values | sum | avg | min | max | earliest | latest |
checked | percent_checked).

For relation: relationDatabaseId is optional (omit for "all rows" — user wires later).

Property ids: use stable lowercase tokens (e.g. "p_status", "p_priority").
Option ids: "p_status_open", "p_status_done", etc.
View ids: "v_table", "v_board", etc.
Row ids in rowProps[relation_prop] should be omitted unless rows reference each other; if so, use "r_<slug>".
`;

const SYSTEM_DB = `You are a database schema generator for a Notion-like app. Output ONLY a single JSON object — no prose, no markdown fences.

Shape:
{
  "version": 1,
  "exportedAt": "<ISO date>",
  "database": {
    "name": "<short name>",
    "icon": "<single emoji>",
    "properties": [Property...],
    "views": [DatabaseViewConfig...],
    "activeViewId": "v_table"
  },
  "rows": [{ "title": "...", "icon": "📄", "rowProps": { "p_xxx": value, ... } }, ...]
}

Each view at minimum: { "id": "v_xxx", "name": "...", "type": "table"|"board"|"list"|"gallery"|"calendar"|"timeline"|"chart"|"dashboard"|"feed"|"map"|"form", "sorts": [], "filters": [], "search": "" }.

Always include a Title-style first column implicitly (use "title" as a property reference, not a column). Provide at least 5 properties (mix of types) and at least 4 sample rows. Include 1 formula property tied to other properties (e.g. days remaining, total cost, status badge text). Include at least one Table view; add a Board view when there's a status/select.

${SCHEMA_RULES}

Output JSON only.`;

const SYSTEM_ROWS = `You are a row generator for an existing database. Output ONLY a JSON array — no prose, no fences.

Each item: { "title": "<row title>", "icon": "<emoji>", "rowProps": { "<propId>": <value>, ... } }

Use the EXACT property ids supplied in the schema. For select / multi_select / status, use option NAMES (the importer will resolve to ids). Skip computed properties (rollup, formula, created_*, last_edited_*, unique_id). Skip relation / files / person.

Output JSON array only.`;

/* ============================================================
 * Anthropic call
 * ============================================================ */

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

async function callClaude(opts: {
  apiKey: string;
  model?: string;
  system: string;
  prompt: string;
  signal?: AbortSignal;
}): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: opts.signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: opts.model ?? getModel(),
      max_tokens: 4096,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as AnthropicResponse;
  const text = data.content.map((c) => c.text ?? "").join("");
  return extractJson(text);
}

/** Strip ```json fences and any leading/trailing prose so JSON.parse works. */
function extractJson(raw: string): string {
  let s = raw.trim();
  // Code fence?
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // Find first JSON-looking char
  const startObj = s.indexOf("{");
  const startArr = s.indexOf("[");
  let start = -1;
  if (startObj === -1) start = startArr;
  else if (startArr === -1) start = startObj;
  else start = Math.min(startObj, startArr);
  if (start === -1) return s;
  const lastObj = s.lastIndexOf("}");
  const lastArr = s.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  return end > start ? s.slice(start, end + 1) : s.slice(start);
}

/* ============================================================
 * Public — generate full database export
 * ============================================================ */

export async function generateDatabase(
  prompt: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<DatabaseExportV1> {
  const json = await callClaude({ apiKey, system: SYSTEM_DB, prompt, signal });
  const parsed = JSON.parse(json);
  parsed.version = 1;
  parsed.exportedAt = parsed.exportedAt || new Date().toISOString();
  if (!parsed.database || !parsed.rows) {
    throw new Error("AI response missing required `database` / `rows` fields.");
  }
  return parsed as DatabaseExportV1;
}

/* ============================================================
 * Public — generate rows for an existing schema
 * ============================================================ */

export async function generateRows(
  prompt: string,
  db: Database,
  apiKey: string,
  count: number = 5,
  signal?: AbortSignal,
): Promise<AIRowDraft[]> {
  const schemaSummary = {
    name: db.name,
    properties: db.properties
      .filter((p) => !["rollup", "formula", "created_time", "created_by", "last_edited_time", "last_edited_by", "unique_id"].includes(p.type))
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        options: p.options?.map((o) => o.name),
      })),
  };
  const userPrompt = `Schema:\n${JSON.stringify(schemaSummary, null, 2)}\n\nGenerate ${count} rows. User request:\n${prompt}`;
  const json = await callClaude({ apiKey, system: SYSTEM_ROWS, prompt: userPrompt, signal });
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("AI response is not a JSON array of rows.");
  return parsed as AIRowDraft[];
}
