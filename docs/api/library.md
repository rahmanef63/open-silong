# Library

Route: `/dashboard/library`. Slice: `frontend/slices/library/`.

A Notion-canonical workspace browser: every page in the active
workspace split into 5 tabs, each rendered as a sortable table with
checkboxes for bulk operations.

## Tabs

| Key | Source | Rule |
|---|---|---|
| `recents` | `useStore().recents` | Last 20 visited (from per-user `recents` Convex table). |
| `favorites` | `pages.filter(p => p.favorite)` | Star-toggled pages, sorted by `updatedAt` desc. |
| `shared` | `pages.filter(p => p.isPublic)` | Pages with `isPublic === true`, sorted by `updatedAt` desc. |
| `private` | top-level non-public | `parentId === null && !p.isPublic`, sorted by `updatedAt` desc. |
| `databases` | `useStore().databases` | Every non-trashed database, sorted by `updatedAt` desc. |

Trashed pages and database rows (`rowOfDatabaseId !== undefined`) are
excluded from the four page tabs.

Pure splitter: `frontend/slices/library/lib/groupPages.ts:groupPagesForLibrary`
— takes `{ pages, recentIds, recentLimit? }`, returns `LibrarySection[]`
(four buckets; the `databases` tab is handled separately by `LibraryView`
since it draws from `databases`, not `pages`).

`pageSource(page, pages, databases)` is the resolver behind the
**Source** column. It returns the immediate parent only (no breadcrumb
walk):

```ts
{ kind: "root" | "page" | "database",
  label: "Root" | parent.title | db.name,
  icon?: parent.icon | db.icon,
  targetId: parent.id | db.id | null }
```

- Top-level pages → `{ kind: "root", label: "Root", targetId: null }`.
- Nested pages → the parent page (clickable, opens parent).
- Database rows → the host database (clickable, navigates to its host
  page).
- Missing parent / missing db → falls back to `root` (never throws).

`pageBreadcrumb` is retained for callers that need the full chain (none
in-tree today). 5 unit tests cover `pageSource` paths.

## Table columns

`PagesTable.tsx` renders:

| Column | Visible | Source |
|---|---|---|
| ☐ checkbox | always | tab-level select-all in header |
| Name | always | `<DynamicIcon>` + title (clickable → page) |
| Created by | `md+` | `user.name ?? user.email ?? "You"` |
| Source | `lg+` | `pageSource()` — "Root" or parent page/db (clickable) |
| Last edited | `md+` | `formatRelTime(p.updatedAt)` |
| Last visited | `xl+` | rank in `recents` (or "—") |

`DatabasesTable.tsx` renders the same shape minus checkboxes (no bulk
ops on databases yet) plus a `Rows` column. Source is always "Root"
for now — databases have no parent in the schema.

## Tab switcher

Radix `Tabs` primitive (`frontend/shared/ui/tabs.tsx`). The active tab
is local state (no URL query param). Each trigger shows a count badge
that updates with the filter.

## Bulk actions

`BulkActionBar.tsx` is a fixed-position toolbar at the bottom of the
viewport, shown when `selected.size > 0`:

- Favorite / Unfavorite (toggle based on `selectedPages.every(p => p.favorite)`)
- Make public / Make private (toggles `isPublic`)
- Export JSON (opens `WorkspaceIODialog` with `tab: "export"`,
  `preselectPageId: selected[0]`)
- Trash (confirms, calls `deletePage` for each — moves to trash, recoverable)
- Clear selection

All actions hit the existing `useStore()` mutations (`toggleFavorite`,
`togglePublic`, `deletePage`) — no new Convex endpoint added. Bulk
operates on pages only; the Databases tab does not select.

## Filter

A title-substring filter at the top reduces visible pages across the
four page tabs **and** databases. The count badge per tab reflects the
filtered total.

## Why no Convex query?

All data is already loaded by `StoreProvider` for the sidebar — adding
a `library.list` query would duplicate state and lag behind optimistic
updates. The pure splitter operates on the same in-memory `pages`
array.
