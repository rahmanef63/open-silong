# Templates API

Workspace template system — admin-managed JSON blueprints that any
user can instantiate into a fresh page+database tree. Power users get
a one-click "spin up Notion-clone of X" experience.

## Source

- `convex/templates/` — server (queries, mutations, seed catalog)
- `convex/templates/lib/validate.ts` — zod schema for `TemplateJson`
- `convex/templates/lib/instantiate.ts` — pure builder
- `convex/templates/seed/` — 8 seed templates
- `frontend/slices/templates/` — gallery dialog (user-facing)
- `frontend/slices/admin-panel/components/TemplatesPanel.tsx` — admin
- `frontend/slices/admin-panel/components/TemplateEditor.tsx` — JSON editor
- `frontend/slices/admin-panel/components/AIGenerateDialog.tsx` — AI
  prompt generator (4 providers: Claude / ChatGPT / Grok / Gemini)
- `frontend/slices/admin-panel/lib/aiTemplatePrompt.ts` — schema-aware
  prompt builder + JSON extractor

## Mutations

| Function | Auth | Purpose |
|---|---|---|
| `templates.mutations.upsertTemplate` | admin | Create or patch a template |
| `templates.mutations.deleteTemplate` | admin | Remove (seeds are protected — unpublish instead) |
| `templates.mutations.instantiate` | user | Materialize a template into the user's workspace |
| `templates.mutations.seedDefaults` | admin | Re-install / refresh the 8 seed templates |

## Queries

| Function | Auth | Returns |
|---|---|---|
| `templates.queries.listPublished` | user | metadata-only DTOs (no full JSON) |
| `templates.queries.listAll` | admin | full docs incl. drafts |
| `templates.queries.getOne` | user (admin if !published) | full doc |

## TemplateJson schema

Top-level (required): `{ version: 1, name, icon, category, description?, page }`

```ts
page: {
  ref?: string;              // unique within template
  title: string;
  icon: string;              // emoji
  cover?: string | null;
  blocks: TplBlock[];        // max 500
  databases?: TplDatabase[]; // max 20 (across whole tree)
  children?: TplPage[];      // max 50, recursive
}
```

### TplBlock — extended in cycle 7 to support nested layouts

```ts
{
  type: paragraph | h1..h3 | todo | bullet | numbered | quote | code
      | divider | callout | page | database | columns2 | columns3
      | toggle | image | equation | table | embed | button,
  text?: string,
  checked?: boolean,         // for todo
  lang?: string,             // for code
  databaseRef?: string,      // for database block (must match a TplDatabase.ref)
  pageRef?: string,          // for page block (must match a TplPage.ref)
  columns?: TplBlock[][],    // for columns2 (length 2) / columns3 (length 3)
  children?: TplBlock[],     // for toggle
  payload?: Record<string, any>, // sprayed onto the block (image url, embed url, button label, color, …)
}
```

Validation rules (cycle 7):
- `columns2` must have exactly 2 sub-arrays in `columns`
- `columns3` must have exactly 3 sub-arrays
- Database refs are checked recursively through `columns` AND `children`

### TplProperty

```ts
{
  id, name, type,
  options?, numberFormat?, numberCurrencyCode?, numberDecimals?,
  formulaExpression?,
  relationDatabaseRef?,      // cross-db relation target — refers to TplDatabase.ref
  relationTwoWay?,
  uniqueIdPrefix?,
}
```

Property types (22): `text | number | select | multi_select | status |
date | person | checkbox | url | email | phone | files | relation |
rollup | formula | created_time | created_by | last_edited_time |
last_edited_by | unique_id | button | place`

### TplView — extended in cycle 7

```ts
{
  id, type, name, isDefault?, groupBy?,
  payload?: Record<string, any>,  // sprayed onto DatabaseViewConfig
}
```

View types (11): `table | board | list | gallery | calendar | timeline |
chart | dashboard | feed | map | form`

Common payloads:
- **dashboard** — `{ dashboardKPIs: ["<numericPropId>"], dashboardBreakdowns: ["<propId>"], dashboardRecentLimit?: number }`
- **chart** — `{ chartKind: "bar"|"line"|"area"|"pie"|"donut", chartXProp, chartYProp?, chartAggregate: "count"|"sum"|"avg"|"min"|"max", chartShowLegend?: boolean }`
- **calendar** — `{ calendarDateProp: "<propId>", calendarMode: "month"|"week", calendarColorByProp?: "<propId>" }`
- **gallery** — `{ gallerySize: "small"|"medium"|"large", galleryAspect: "square"|"video"|"portrait" }`

## Instantiate flow

`instantiateTemplate(ctx, template, userId, rootParentId)`:

1. **Pre-allocate empty databases** — assign Convex ids so cross-refs
   can resolve in the next step.
2. **Patch each db with real properties** — now `relationDatabaseRef`
   resolves to a real `Id<"databases">`.
3. **Pre-order page walk** — insert pages with first-pass blocks;
   forward `pageRef`s may not resolve yet.
4. **Second-pass repatch** — pages with unresolved `pageRef`s get
   their blocks rebuilt. Walks recursively through `columns` +
   `children`.
5. **Seed rows** — each row = a `pages` doc with `rowOfDatabaseId` +
   `rowProps`; appended to db's `rowIds`.

Returns `{ rootPageId, insertedPages, insertedDatabases, insertedRows }`.

## Seed catalog

8 templates ship with the platform (`SEED_TEMPLATES`):

| Template | Category | Databases | Highlights |
|---|---|---|---|
| Expense Tracker | Finance | 1 | Currency formatted amount, category board |
| Reading List | Personal | 1 | Status board |
| Habit Tracker | Personal | 1 | Daily check-in board |
| **Project OS** | Productivity | 2 (relation) | columns3 KPIs + columns2 projects/tasks; 5-view tasks db (table/board/calendar/chart/dashboard); sprint backlog child page |
| **Personal CRM** | Sales | 3 (2× relation) | columns3 KPIs + columns2 contacts/deals; deals db with chart by stage + dashboard; interactions feed view |
| **Content Calendar** | Marketing | 1 | columns3 workflow + columns2 pipeline/calendar; 6-view content db (table/board/calendar/chart/dashboard/gallery) |
| **OKR Tracker** | Strategy | 2 (relation) | columns3 health-check + columns2 KRs/scoring guide; chart + dashboard views |
| **Recipe Vault** | Lifestyle | 2 (relation) | columns3 quick-filter + columns2 recipes/meal-plan + columns2 shopping list; gallery view |

Last 5 (cycle 7) are designed to maximize column usage and showcase
the dashboard view.

## AI prompt generator

Admin → Template editor → "Generate with AI" button.

Three-step UX:

1. **Describe intent** — free text + 4 sample chips.
2. **Pick provider** — Claude / ChatGPT / Grok / Gemini. Click copies
   the schema-aware prompt to clipboard + opens the provider's web UI
   in a new tab.
3. **Paste JSON** — `extractJson()` strips code fences + preamble.
   "Apply" validates with `JSON.parse` then forwards to the editor;
   `name`/`icon`/`category`/`description` auto-derived from the parsed
   object.

The generated prompt includes:
- Full TemplateJson schema spec (block / property / view types + payload examples)
- A few-shot example (Habit Tracker, columns2 + 4 views)
- 12 hard rules (one JSON object only, valid refs, exact column counts, ≥2 views per db, seed ≥2–3 rows, etc.)
- The user's intent verbatim

`buildAiPrompt(intent)` and `extractJson(raw)` are pure helpers in
`frontend/slices/admin-panel/lib/aiTemplatePrompt.ts` — 11 unit tests.

## Adding a new property/view type to the template DSL

1. Add the literal to `validate.ts`'s `PROPERTY_TYPES` / `VIEW_TYPES`.
2. If it has its own config field (like `relationDatabaseRef`), add
   to `TplProperty` schema + handle in `instantiate.ts:buildDbDoc`.
3. If it has its own view payload, document the payload shape in
   `aiTemplatePrompt.ts:SCHEMA_SPEC` so AI prompts produce valid
   output.
4. Add a validate test (`validate.test.ts`) + seed catalog smoke test
   (`seedCatalog.test.ts`) if a seed uses it.
