# Domain types reference

All shared types live in `frontend/shared/types/domain.ts`. Server-side
Convex schema (`convex/schema.ts`) widens the discriminated unions to
`v.any()` for `blocks`, `rowProps`, `views`, `properties`. Client is
the source of truth for shape.

Import from `@/shared/types/domain` in any frontend module.

---

## `Block` — the unit of page content

```ts
type BlockType =
  | "paragraph" | "h1" | "h2" | "h3"
  | "todo" | "bullet" | "numbered" | "quote" | "callout"
  | "code" | "divider" | "page" | "database"
  | "columns2" | "columns3" | "toggle"
  | "image" | "equation" | "table" | "embed" | "button";

interface Block {
  id: string;          // 8-char base36, unique-per-page
  type: BlockType;
  text: string;        // plain-text source (markdown markers literal)
  color?: string;      // 10-color palette key
  bgColor?: string;    // 10-color palette key

  // todo
  checked?: boolean;

  // code
  lang?: string;

  // page / database / button
  pageId?: string;
  databaseId?: string;

  // columns2 / columns3
  columns?: Block[][];
  colWidths?: number[];

  // toggle
  children?: Block[];
  collapsed?: boolean;

  // image / embed / button
  url?: string;
  caption?: string;
  width?: number;
  align?: "left" | "center" | "right";

  // table
  tableRows?: string[][];
  tableHeader?: boolean;
}
```

Full block-type behavior matrix lives in `docs/api/blocks.md`.

---

## `Page` — the container

```ts
type PageFont = "default" | "serif" | "mono";

interface Page {
  id: string;                       // Id<"pages">
  parentId: string | null;          // tree pointer
  title: string;
  icon: string;                     // emoji | lucide:name | twemoji url
  cover?: string | null;            // gradient css | image url
  blocks: Block[];

  favorite: boolean;
  trashed: boolean;
  isPublic?: boolean;
  shareSlug?: string;               // /share/<slug>
  shareIndexable?: boolean;         // sitemap + meta robots, default false

  // db row mode
  rowOfDatabaseId?: string;         // db this page is a row of
  rowProps?: Record<string, PropertyValue>;

  // typography
  font?: PageFont;
  smallText?: boolean;
  fullWidth?: boolean;
  locked?: boolean;

  // wiki
  wiki?: {
    ownerId: string; ownerName: string; ownerIcon: string;
    verified: boolean; verifiedAt?: number;
  };

  // derived (only on listMeta queries)
  databaseHostFor?: string[];       // dbIds hosted by this page
  blockCount?: number;
  previewText?: string;             // ≤120 chars

  createdAt: number;
  updatedAt: number;
}
```

> `databaseHostFor`, `blockCount`, `previewText` are populated only by
> the slim `pages.listMeta` query. The full `getById` doc does not
> populate them — derive from `blocks` directly there.

---

## `Database` — schema host

```ts
interface Database {
  id: string;                       // Id<"databases">
  name: string;
  icon: string;
  properties: Property[];
  rowIds: string[];                 // ordered Id<"pages">
  views: DatabaseViewConfig[];
  activeViewId: string;

  uniqueIdCounter?: number;         // atomic per-db
  templates?: DatabaseTemplate[];
  defaultTemplateId?: string | null;
  subItemsParentPropId?: string | null;
  trashed?: boolean;

  createdAt: number;
  updatedAt: number;
}
```

---

## `Property` — schema column

```ts
type PropertyType =
  | "text" | "number" | "select" | "multi_select" | "status"
  | "date" | "person" | "checkbox" | "url" | "email" | "phone"
  | "files" | "relation" | "rollup" | "formula"
  | "created_time" | "created_by" | "last_edited_time" | "last_edited_by"
  | "unique_id" | "button" | "place";

type CalcKind =
  | "none"
  | "count_all" | "count_values" | "count_unique_values"
  | "count_empty" | "count_not_empty"
  | "percent_empty" | "percent_not_empty"
  | "sum" | "average" | "median" | "min" | "max" | "range"
  | "checked" | "unchecked" | "percent_checked" | "percent_unchecked"
  | "earliest_date" | "latest_date" | "date_range";

type ButtonAction =
  | { kind: "open_url"; url: string }
  | { kind: "open_page"; pageId: string }
  | { kind: "edit_property"; propId: string; value: PropertyValue }
  | { kind: "show_confirmation"; message: string };

type NumberFormat = "number" | "decimal" | "percent" | "currency";

interface Property {
  id: string;
  name: string;
  type: PropertyType;
  hidden?: boolean;                 // global hide (vs view.hiddenPropIds)
  description?: string;             // shown in property panel + form view
  options?: SelectOption[];         // select | multi_select | status

  // number
  numberFormat?: NumberFormat;      // default "number"
  numberDecimals?: number;          // 0..4; default 0 (number/percent), 2 (decimal/currency)
  numberCurrencyCode?: string;      // ISO 4217, default "USD"

  // relation
  relationDatabaseId?: string | null;
  relationTwoWay?: boolean;         // mirror to inverse on add/remove
  relationInversePropertyId?: string; // pointer set on twoWay enable

  // rollup
  rollupRelationPropertyId?: string | null;
  rollupTargetPropertyId?: string | null;
  rollupAggregate?:
    | "count" | "count_unique" | "values"
    | "sum" | "avg" | "min" | "max"
    | "earliest" | "latest"
    | "checked" | "percent_checked";

  // formula
  formulaExpression?: string;

  // unique_id
  uniqueIdPrefix?: string;

  // button
  buttonLabel?: string;
  buttonActions?: ButtonAction[];

  description?: string;
}

interface SelectOption {
  id: string;
  name: string;
  color: string;                    // semantic palette key
}
```

---

## `PropertyValue` — cell value union

```ts
type PropertyValue =
  | string                          // text / select / status / date-iso / unique_id / url / email / phone / formula(string) / created_by / last_edited_by
  | number                          // number / formula(number)
  | boolean                         // checkbox / formula(boolean)
  | null                            // empty
  | string[]                        // multi_select option ids | person ids | relation rowIds | files (url-or-storage refs)
  | { date?: string };              // legacy date wrapper (still used in some seed paths)
```

Cell editors marshal into the matching shape:

| property type | cell value |
|---|---|
| text / url / email / phone | `string` |
| number | `number` |
| select / status | `string` (option id) |
| multi_select | `string[]` (option ids) |
| date | `string` (ISO 8601) |
| person | `string[]` (user ids; today single-user always self) |
| checkbox | `boolean` |
| files | `string[]` — url OR `storage:<id>:<filename>` ref |
| relation | `string[]` — `Id<"pages">` of related rows |
| rollup / formula / created_* / last_edited_* / unique_id | computed (read-only cell) |

---

## `DatabaseViewConfig` — view shape

50+ optional fields. Per-view-type field matrix is documented in
`docs/api/databases.md` (View matrix). Common across all views:

```ts
interface DatabaseViewConfig {
  id: string;
  name: string;
  type: DbView;                     // 11 view kinds
  sorts: DatabaseSort[];
  filters: DatabaseFilter[];
  search: string;
  hiddenPropIds?: string[];         // per-view (independent of Property.hidden)
  // ... type-specific fields below ...
}

interface DatabaseSort {
  propertyId: string;
  direction: "asc" | "desc";
}

interface DatabaseFilter {
  propertyId: string;
  op: "contains" | "equals" | "not_empty" | "is_empty" | "checked" | "unchecked";
  value?: string;
}
```

---

## `Preferences` — per-user settings

```ts
interface Preferences {
  theme: "light" | "dark" | "system";
  sidebarDensity: "compact" | "comfortable";
  defaultPageSort: "manual" | "title" | "updated" | "created";
  editorBehavior: "default" | "minimal";
  landingView: "dashboard" | "recent" | "favorites" | "last";
  lastOpenedPageId: string | null;
}
```

Persisted via `convex/preferences.ts`.

---

## `UserProfile` — public-ish identity

```ts
interface UserProfile {
  id: string;
  name: string;
  email: string;
  bio: string;
  icon: string;                     // emoji avatar
  color: string;                    // hsl bg
}
```

`userProfiles` table (`convex/schema.ts:userProfiles`) carries
`role: "user" | "superadmin"` for admin gating — NOT exposed in the
`UserProfile` type because consumers shouldn't branch on role outside
of `convex/admin/*` and `requireSuperAdmin`.

---

## `PageSnapshot` — version history entry

```ts
interface PageSnapshot {
  id: string; pageId: string;
  authorId: string; authorName: string;
  takenAt: number;
  title: string; icon: string; cover?: string | null;
  blocks: Block[];
  rowProps?: Record<string, PropertyValue>;
}
```

Snapshots are append-only. `convex/snapshots.ts:restore` does NOT
delete the snapshot row — restore re-applies the snapshot's content
onto the current page (so you can restore again, or branch). Keep a
50-snapshot per-page take cap in mind when building UI (`listForPage`
returns the most recent 50).
