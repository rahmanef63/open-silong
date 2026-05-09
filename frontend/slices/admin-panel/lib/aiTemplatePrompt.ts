/** AI prompt generator for Nosion templates.
 *
 *  Produces a fully-formed prompt — schema spec + few-shot example +
 *  user intent — that any top-tier LLM (GPT-4/5, Claude, Grok,
 *  Gemini) can answer with a valid TemplateJson.
 *
 *  Approach: copy the prompt to the user's clipboard + open a new
 *  tab with the LLM's web UI. The user pastes, runs, copies the JSON
 *  back into the editor. No API key, no credits, no integration —
 *  zero coupling to any specific LLM provider.
 *
 *  Companion to `convex/templates/lib/validate.ts` — when the schema
 *  there changes, mirror it here. */

export type AiProvider = "claude" | "openai" | "grok" | "gemini";

export const AI_PROVIDERS: Array<{
  id: AiProvider;
  label: string;
  url: string;
  emoji: string;
  hint: string;
}> = [
  { id: "claude", label: "Claude", url: "https://claude.ai/new",     emoji: "🟧", hint: "Best at long, structured output." },
  { id: "openai", label: "ChatGPT", url: "https://chat.openai.com/", emoji: "🟢", hint: "Strong general baseline." },
  { id: "grok",   label: "Grok",   url: "https://grok.com/",          emoji: "⚡", hint: "Often most up-to-date world knowledge." },
  { id: "gemini", label: "Gemini", url: "https://gemini.google.com/", emoji: "🟣", hint: "Strong on Google-stack integrations." },
];

const SCHEMA_SPEC = `# Nosion TemplateJson schema

Top-level (required): { version: 1, name, icon (emoji), category, description?, page }

page: {
  ref?: string,                          // unique id within template
  title: string,
  icon: string (emoji),
  cover?: string | null,
  blocks: TplBlock[],                    // max 500
  databases?: TplDatabase[],             // max 20 (across whole tree)
  children?: TplPage[],                  // max 50, recursive
}

TplBlock (discriminated by \`type\`):
  type: paragraph | h1 | h2 | h3 | todo | bullet | numbered | quote
      | code | divider | callout | page | database | columns2
      | columns3 | toggle | image | equation | table | embed | button
  text?: string                          // for text-bearing blocks
  checked?: boolean                      // for todo
  lang?: string                          // for code (e.g. "js","python","plain text")
  databaseRef?: string                   // for database block (must match a TplDatabase.ref)
  pageRef?: string                       // for page block (must match a TplPage.ref)
  columns?: TplBlock[][]                 // for columns2 (length 2) / columns3 (length 3)
  children?: TplBlock[]                  // for toggle
  payload?: Record<string, any>          // sprayed onto the block — use for image url, embed url,
                                         // button label/actions, color, bgColor, etc.

TplDatabase: { ref, name, icon (emoji), properties[1-50], views?[0-20], seedRows?[0-200] }

TplProperty: { id, name, type, options?, numberFormat?, numberCurrencyCode?, numberDecimals?,
              formulaExpression?, relationDatabaseRef?, relationTwoWay?, uniqueIdPrefix? }

  property type ∈ text | number | select | multi_select | status | date | person
                | checkbox | url | email | phone | files | relation | rollup | formula
                | created_time | created_by | last_edited_time | last_edited_by
                | unique_id | button | place

  numberFormat ∈ plain | number | decimal | currency | percent
  numberCurrencyCode = ISO 4217 (USD, EUR, IDR, …) — only when format=currency

TplView: { id, type, name, isDefault?, groupBy?, payload? }
  view type ∈ table | board | list | gallery | calendar | timeline
            | chart | dashboard | feed | map | form

  payload examples (sprayed on the view config):
    calendar:  { calendarDateProp: "<propId>", calendarMode: "month"|"week", calendarColorByProp?: "<propId>" }
    chart:     { chartKind: "bar"|"line"|"area"|"pie"|"donut",
                 chartXProp: "<propId>", chartYProp?: "<propId>",
                 chartAggregate: "count"|"sum"|"avg"|"min"|"max",
                 chartShowLegend?: boolean }
    dashboard: { dashboardKPIs: ["<numericPropId>"], dashboardBreakdowns: ["<categoricalPropId>"], dashboardRecentLimit?: number }
    gallery:   { gallerySize: "small"|"medium"|"large", galleryAspect: "square"|"video"|"portrait" }
    board:     { boardCardSize: "small"|"medium"|"large", boardColorByProp?: "<propId>" }
    feed:      { feedTimestamp: "createdAt"|"updatedAt", feedDensity: "compact"|"comfortable" }

TplSeedRow: { props: { "<propId>": value } }
  value shape per type:
    text/url/email/phone:  string
    number:                number
    checkbox:              boolean
    select/status:         option id (string from TplProperty.options)
    multi_select:          option ids (string[])
    date:                  ISO date string ("2026-05-09")
    relation:              [] (cross-row links auto-resolve at runtime — leave empty in seed)
    person/files/computed: skip in seed`;

const FEW_SHOT_EXAMPLE = `# Few-shot example: a minimal but realistic template

\`\`\`json
{
  "version": 1,
  "name": "Habit Tracker",
  "icon": "✅",
  "category": "Personal",
  "description": "Daily check-in for habits.",
  "page": {
    "ref": "root",
    "title": "Habit Tracker",
    "icon": "✅",
    "blocks": [
      { "type": "h1", "text": "Habits" },
      { "type": "callout", "text": "Tick a habit each day. Keep streaks going." },
      {
        "type": "columns2",
        "columns": [
          [
            { "type": "h3", "text": "Today" },
            { "type": "todo", "text": "Drink water", "checked": true }
          ],
          [
            { "type": "h3", "text": "All habits" },
            { "type": "database", "databaseRef": "habits" }
          ]
        ]
      }
    ],
    "databases": [
      {
        "ref": "habits",
        "name": "Daily check-ins",
        "icon": "📅",
        "properties": [
          { "id": "name", "name": "Habit", "type": "text" },
          { "id": "date", "name": "Date", "type": "date" },
          { "id": "done", "name": "Done", "type": "checkbox" },
          { "id": "category", "name": "Category", "type": "select",
            "options": [
              { "id": "health", "name": "Health", "color": "green" },
              { "id": "learning", "name": "Learning", "color": "blue" }
            ]
          }
        ],
        "views": [
          { "id": "v1", "type": "table", "name": "All", "isDefault": true },
          { "id": "v2", "type": "board", "name": "By category", "groupBy": "category" },
          { "id": "v3", "type": "calendar", "name": "Calendar",
            "payload": { "calendarDateProp": "date", "calendarMode": "month" } },
          { "id": "v4", "type": "dashboard", "name": "Dashboard",
            "payload": { "dashboardBreakdowns": ["category"], "dashboardRecentLimit": 5 } }
        ],
        "seedRows": [
          { "props": { "name": "Drink water", "date": "2026-05-01", "done": true, "category": "health" } }
        ]
      }
    ]
  }
}
\`\`\``;

const RULES = `# Rules

1. Output ONE JSON object — nothing else. No commentary, no markdown fences in your final answer.
2. Every \`databaseRef\` referenced from a block must match a database \`ref\` somewhere in the tree.
3. Every \`pageRef\` referenced must match a page \`ref\`.
4. \`columns2\` MUST have exactly 2 sub-arrays in \`columns\`; \`columns3\` MUST have exactly 3.
5. \`relationDatabaseRef\` on a property must point at another database in the same template.
6. \`groupBy\` on a board view = a property id of type \`select\` or \`status\` or \`multi_select\`.
7. Use icons (emoji) for everything. Strong icon use is part of the brand.
8. Maximize columns — pair related databases side-by-side when it makes sense.
9. Every database with > 1 row should have at least 2–3 views (table + board OR table + calendar minimum). Power-user templates ship 5+ views including a dashboard.
10. Seed at least 2–3 rows per database so the user sees the layout in action.
11. Property \`id\` must be unique within a database; option \`id\` unique within a property.
12. Cap: 500 blocks per page, 50 databases per template, 200 seed rows per database.`;

/** Build a single, fully-formed prompt the user can paste into any
 *  LLM web UI. Includes schema, few-shot, rules, and the user's intent. */
export function buildAiPrompt(userIntent: string): string {
  return `You are an expert at designing Nosion (Notion-clone) workspace templates.
Generate a single \`TemplateJson\` for the user's intent below.

${SCHEMA_SPEC}

${FEW_SHOT_EXAMPLE}

${RULES}

# User intent

${userIntent.trim() || "(no intent supplied — produce a balanced productivity dashboard with one main database)"}

# Output

Now respond with ONE JSON object. No prose, no fences, no commentary — just the JSON.`;
}

/** Try to extract a fenced or bare JSON object from arbitrary LLM
 *  output. Returns the JSON string if found, else the input
 *  unchanged so the user can spot what went wrong. */
export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) return fenced[1].trim();
  // Greedy: first `{` to last `}`.
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first !== -1 && last > first) return raw.slice(first, last + 1).trim();
  return raw.trim();
}
