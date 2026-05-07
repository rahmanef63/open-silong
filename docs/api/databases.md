# Databases API — `convex/databases.ts`

Public Convex functions for the `databases` table. A database is a
sibling to `pages` — its rows ARE pages (with `rowOfDatabaseId` set).
This means database row content (blocks, comments, snapshots) flows
through `convex/pages.ts`, while database schema / views / row-id list
live here.

Schema: `convex/schema.ts:databases`. Index: `by_user`.

---

## Identity / DTO conventions

- Every public fn requires authenticated user. No anonymous-readable
  database surface (sharing happens at the row-page level via
  `pages.getPublicShare`).
- `requireOwned(ctx, "databases", id)` — same auth pattern as pages.
- `setRowValue` and `deleteRow` BOTH check page ownership AND db
  ownership (rows belong to the same user, but defense-in-depth).

---

## Queries

### `list() → Doc<"databases">[]`

Owner-only full list. Includes `properties[]`, `views[]`, `rowIds[]`,
`templates[]`. Used by `useStore` for the workspace database registry
(every view config + property schema needs to be available offline-ish
in the React tree).

> **Performance note**: unlike `pages.list`, this is acceptable to ship
> in full because databases are typically O(10s), not O(100s+).

There is no `getById(dbId)` — single-database fetch is unnecessary
because the workspace usually has all databases already. If a feature
needs one-off access (e.g. a public form view), introduce a dedicated
DTO query.

---

## Mutations

### `create({name?: string}) → Id<"databases">`

Seeds a database with:
- Title property `Name` (type `text`)
- Status property `Status` with three options (`Not started`, `In progress`, `Done`)
- One Table view (`activeViewId`)

**Returns** the new database id directly.

> **Convention**: callers immediately follow with an `update(dbId,
> {properties, views, ...})` to overwrite the seed when applying a
> preset. See `frontend/slices/database-presets/`.

---

### `update({dbId, patch})`

**`patch: v.any()`** — accepts any partial of the database doc.
This is the firehose — nearly every database mutation flows through
here:

| frontend action | patch shape |
|---|---|
| Rename | `{name}` |
| Change icon | `{icon}` |
| Add/rename/delete property | `{properties: [...]}` |
| Add/rename/delete/duplicate view | `{views: [...]}` |
| Activate view | `{activeViewId}` |
| Save filters/sorts/visibility | `{views: [...]}` (whole array replace) |
| Save template | `{templates: [...]}` |
| Set default template | `{defaultTemplateId}` |

**Why a single firehose mutation**: avoids 50+ thin mutations for
every property/view operation; client computes the next state and
patches. Cost: a bug in client logic can corrupt schema. Mitigation:
mutation guard in `frontend/shared/lib/store/mutationGuard.ts` runs
sanity checks before sending.

**Auth**: `requireOwned`. **Validation**: none server-side beyond
auth. The client is fully trusted on schema shape.

---

### `addRow({dbId, init?, templateId?}) → Id<"pages">`

Inserts a new row page with:
- `rowOfDatabaseId: dbId`
- `rowProps`: merged from `templateId` (or `defaultTemplateId`) +
  `init.rowProps`
- `blocks`: from template's body, ids regenerated; else one empty
  paragraph
- Auto-bumps every `unique_id` property's counter and seeds the row
  with the next id (prefix-aware)

**Side effect**: appends `rowId` to `database.rowIds` and increments
`uniqueIdCounter`.

**Returns**: the new row's `Id<"pages">` — caller uses this to open
the row peek / navigate to the row page.

---

### `setRowValue({dbId, rowPageId, propId, value})`

Patches a single property on a row. Auth via `requireOwned(pages,
rowPageId)` — the row's page ownership IS the gate.

> **Quirk**: `dbId` argument is currently unused server-side. It's kept
> for future cross-row computed updates (e.g. relation propagation).
> Pass the parent dbId for forward compatibility.

`value` is `v.any()` — see `PropertyValue` in
`docs/types/domain.md`. Frontend cell editors marshal into the
allowed shape.

---

### `deleteRow({dbId, rowPageId})`

Two-step:
1. `pages.patch(rowPageId, {trashed: true})` — soft delete
2. `databases.patch(dbId, {rowIds: rowIds - rowPageId})` — drops from
   the row list

The row's page is recoverable from the trash for 30 days (see
`convex/maintenance.purgeStaleTrash`). After that the page row is
permanently deleted but the database has already lost its rowIds entry
— there's no automatic re-add on restore (known limitation).

---

### `trash({dbId})` / `restore({dbId})`

Soft-flip `trashed: true|false` on the database itself. Does NOT
cascade to row pages — those stay reachable via direct id (e.g. from
backlinks). Restore likewise only un-flips the db.

> If you need a "trash all rows with the database" semantic, follow
> `databases.trash` with a loop over `db.rowIds` calling
> `pages.trash`. Currently no public mutation does this.

### `permanentlyDelete({dbId})`

Cascades:
1. Iterates `db.rowIds`, deletes every row page (only those owned by
   the same user).
2. Deletes the database doc.

Snapshots referencing those row pages are NOT cleaned up here —
`pages.permanentlyDelete` is the surface that walks
`snapshots.by_user_page`. If you bypass that and call
`databases.permanentlyDelete` directly with rows that have snapshots,
you'll leak orphan snapshot rows. (Today, `addRow` row pages don't
get user-initiated snapshots, so the leak is rare.)

---

## Database schema (`Database` type)

```ts
interface Database {
  id: string;
  name: string; icon: string;
  properties: Property[];      // see types/domain.md
  rowIds: string[];            // ordered Id<"pages"> values
  views: DatabaseViewConfig[]; // see types/domain.md
  activeViewId: string;
  uniqueIdCounter?: number;
  templates?: DatabaseTemplate[];
  defaultTemplateId?: string | null;
  subItemsParentPropId?: string | null;
  trashed?: boolean;
  createdAt: number; updatedAt: number;
}
```

The **single source of truth** is `frontend/shared/types/domain.ts`.
Server-side `convex/schema.ts` declares the Convex types as
`v.any()` for `properties` / `views` / `rowProps` because the
discriminated unions are too wide for the validator. Defense lives
client-side + via the mutation guard.

---

## Views

11 view kinds, each driven by a partial slice of `DatabaseViewConfig`
(other fields ignored when `view.type !== X`). Full per-view field
matrix lives in `docs/types/domain.md`.

| view.type | required props | key options |
|---|---|---|
| `table` | — | `tableWrapCells`, `tableRowHeight`, `hiddenPropIds` |
| `board` | `groupBy` (select/status prop) | `boardCardSize`, `boardCardProps`, `boardColorByProp`, `boardColumnOrder`, `boardHideEmptyGroups` |
| `list` | — | `listSummaryProps`, `listDensity` |
| `gallery` | — | `gallerySize`, `galleryCoverSource`, `galleryCoverProp`, `galleryAspect`, `galleryCardProps` |
| `calendar` | `calendarDateProp` (date) | `calendarEndProp`, `calendarMode`, `calendarColorByProp`, `calendarShowOverdue`, `calendarWeekStart`, `calendarShowWeekends` |
| `timeline` | `timelineStartProp`, `timelineEndProp` (date) | `timelineZoom`, `timelineColorByProp` |
| `chart` | `chartXProp` | `chartKind`, `chartYProp`, `chartAggregate`, `chartShowLegend`, `chartShowGrid`, `chartTopN`, `chartSortBy`, `chartSortDir`, `chartPalette`, `chartDecimals`, `chartTitle`, `chartXLabel`, `chartYLabel`, `chartShowValues`, `chartHeight` |
| `dashboard` | — | `dashboardKPIs`, `dashboardBreakdowns`, `dashboardRecentLimit` |
| `feed` | — | `feedTimestamp`, `feedDensity`, `feedSummaryProps` |
| `map` | `mapLatProp`, `mapLngProp` (number) | `mapPinColorProp`, `mapShowList` |
| `form` | — | `formTitle`, `formDescription`, `formRequiredProps`, `formShownProps`, `formSuccessMessage` |

All views share: `filters[]`, `sorts[]`, `search`, `hiddenPropIds[]`,
`frozenPropIds[]` (Table only — pin columns to left edge),
`tableCalcs: Record<propId, CalcKind>` (Table footer aggregates).

---

## Column header menu (Table view)

Click any column header to open the Notion-style 13-item menu:

| Item | Wires to |
|---|---|
| Edit property | Opens `PropertyConfigPanel` (Dialog) |
| Change type | Submenu — sets `Property.type` |
| AI Autofill | Reserved (deferred) |
| Filter | Seeds `view.filters` with this prop + inferred operator |
| Sort | Submenu — adds asc/desc to `view.sorts`, or clear |
| Group | Switches view to `board` with `groupBy = prop.id` (select/status only) |
| Calculate | Submenu — sets `view.tableCalcs[propId]` to a `CalcKind` |
| Freeze | Toggles prop in `view.frozenPropIds` (sticky-left) |
| Hide | Toggles prop in `view.hiddenPropIds` |
| Wrap content | Toggles `view.tableWrapCells` |
| Insert left/right | `addProperty` then `reorderProperties` to land at offset |
| Delete property | Cascades referenced ids out of all views (see Cascade) |

Implementation: `frontend/slices/databases/components/ColumnHeaderMenu.tsx`.

Calculate aggregates are computed in
`frontend/slices/databases/lib/calcAggregate.ts:computeCalc(rows, prop, calc)`.
Per-type valid set in `validCalcs(prop)`. The footer renders below
the AddRowFooter as a frozen-aware row.

## Property schema (`Property` type)

21 property types. Required type-specific fields:

| type | extra fields |
|---|---|
| `text` / `url` / `email` / `phone` / `checkbox` / `created_time` / `last_edited_time` | — |
| `number` | `numberFormat`, `numberDecimals`, `numberCurrencyCode` |
| `select` / `multi_select` / `status` | `options: SelectOption[]` |
| `date` / `person` / `files` | — (value shape varies) |
| `relation` | `relationDatabaseId`, `relationTwoWay`, `relationInversePropertyId` |
| `rollup` | `rollupRelationPropertyId`, `rollupTargetPropertyId`, `rollupAggregate` |
| `formula` | `formulaExpression` (string) |
| `created_by` / `last_edited_by` | — (resolved from page metadata) |
| `unique_id` | `uniqueIdPrefix?: string` |
| `button` | `buttonLabel`, `buttonActions[]` (open_url / open_page / show_confirmation / edit_property) |
| `place` | free-form location string (map view integration planned) |

### Number formatting

`numberFormat`:

| value | example (en-US) |
|---|---|
| `"number"` (default) | `1,234` |
| `"decimal"` | `1,234.50` |
| `"percent"` (value is 0..100) | `25%` |
| `"currency"` | `$1,234.50` (with `numberCurrencyCode: "USD"`) |

Decimals: 0-4, defaults 0 for `number`/`percent`, 2 for `decimal`/`currency`.
Currency code: ISO 4217 (USD/EUR/GBP/JPY/IDR/SGD/MYR/AUD/CAD/CHF/INR/KRW/THB/VND/PHP/CNY).
Helper: `frontend/slices/databases/lib/numberFormat.ts:formatPropertyNumber`.

### Two-way relations

When `relationTwoWay: true` on a relation property:

1. The store's `setRelationTwoWay(dbId, propId, true)` creates an
   inverse `relation` property on the target db (named `Related <src>` by
   default), pointing back at the source db.
2. The inverse pointer is stored as `relationInversePropertyId` on
   both ends — so toggling off + on reuses the same inverse prop.
3. `setRowValue` (in `frontend/shared/lib/store/databaseActions.ts`)
   diffs added/removed ids and patches the inverse `rowProps[inverseId]`
   on each affected target row. Mirror is automatic; user only edits
   one side.
4. Switching `relationDatabaseId` clears `relationTwoWay` and
   `relationInversePropertyId` (the old inverse stays on the previous
   target db; data is preserved, pointer dropped).

PK / FK semantics: source row's id is the FK stored in target row's
`rowProps[inverseId]` (and vice versa). No server-enforced integrity —
mirroring is best-effort client-side. A direct `setRowValue` call
that bypasses the store (e.g. workspace import) won't mirror; rely on
re-running mirror on import or accept eventual inconsistency.

Aggregates for rollup: `count`, `count_unique`, `values`, `sum`, `avg`,
`min`, `max`, `earliest`, `latest`, `checked`, `percent_checked`.

Formula functions: `if / and / or / not / empty / concat / contains /
replace / lower / upper / length / substring / round / floor / ceil /
abs / min / max / now / today / dateAdd / dateSubtract / dateBetween /
formatDate / count / sum / join`. See
`frontend/slices/databases/lib/formulaEngine.ts` (21 unit tests).

---

## Cascade semantics

When a property is deleted from `properties[]`, the client (in
`useStore.databaseActions.deleteProperty`) strips the propId from:

- every `view.hiddenPropIds`
- every `view.sorts`, `view.filters`
- role-prop arrays: `boardCardProps`, `galleryCardProps`,
  `listSummaryProps`, `feedSummaryProps`, `formRequiredProps`,
  `formShownProps`, `dashboardKPIs`, `dashboardBreakdowns`
- singletons: `groupBy`, `boardColorByProp`, `galleryCoverProp`,
  `calendarDateProp`, `calendarEndProp`, `calendarColorByProp`,
  `timelineStartProp`, `timelineEndProp`, `timelineColorByProp`,
  `chartXProp`, `chartYProp`, `mapLatProp`, `mapLngProp`,
  `mapPinColorProp`

**Server-side does no cascade** — relies on the client mutation guard.

---

## Conventions for new functions

1. **Args**: `dbId: v.string()` (cast). Page-row args: `rowPageId:
   v.string()`.
2. **Auth**: `requireOwned(ctx, "databases", dbId)` for db-only ops;
   `requireOwned(ctx, "pages", rowPageId)` is sufficient for row-only
   ops (the row page IS the auth gate).
3. **Validation**: keep `v.any()` for schema-level patches —
   tightening would force a 19-property × 11-view matrix that's not
   stable yet. Validate on the read side instead (DTO).
4. **Errors**: same as pages — `throw new Error(message)` reaches the
   UI.
5. **Cascade**: any new operation that removes a referenced id
   (property, view, row, template) MUST update every consumer. Walk
   the cascade list above.
6. **Rate limit**: not currently applied. Add `rateLimit(ctx, userId,
   {scope: "databases.<op>", max, windowMs})` on bulk-write
   operations (e.g. CSV import row inserts) — already done in
   `convex/import/zip.ts` and `convex/import/workspace.ts`.
