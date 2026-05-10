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

`PagesTable.tsx` and `DatabasesTable.tsx` share an identical column
shape — fixed widths via `<colgroup>` so a row in one tab lines up
visually with a row in another:

| Column | Visible | Source |
|---|---|---|
| ☐ checkbox | always | tab-level select-all in header (both tables) |
| Name | always | chevron toggle (page only) + `<DynamicIcon>` + title |
| Created by | `md+` | `user.name ?? user.email ?? "You"` |
| Source | `lg+` | `pageSource()` (page) / host page or "Root" (database) |
| Last edited | `md+` | `formatRelTime(updatedAt)` |
| ⋮ actions | always | per-row dropdown (Open / Rename / Favorite / Trash) |

The Name cell is the only column that diverges in content:

- **Pages** — leading `ChevronRight` button (only enabled when the
  page has subpages). Click expands inline child rows beneath, indented
  by `depth × 16px` in the Name cell only — every other column stays
  pixel-aligned. Subtitle "_N sub_" appears next to the title when
  there are children. Recursive: child rows can themselves expand.
  Children are pulled from `allPages` so e.g. a Favorites-tab parent
  can still expand into its full subtree.
- **Databases** — empty 5px chevron gutter (for column alignment) +
  icon + title + "_N rows_" subtitle. No expansion.

Database **Source** column resolves the host page via
`pages.find(p => p.databaseHostFor?.includes(db.id))` — clickable when
present, falls back to "Root" for loose databases.

Inline rename (double-click title) and inline icon swap (click icon →
`IconPickerPopover`) work on both pages and databases.

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
`togglePublic`, `deletePage`) — no new Convex endpoint added. The
Databases tab has its own selection set + `DbBulkActionBar` (trash
only).

## Filter

A title-substring filter at the top reduces visible pages across the
four page tabs **and** databases. The count badge per tab reflects the
filtered total.

## Why no Convex query?

All data is already loaded by `StoreProvider` for the sidebar — adding
a `library.list` query would duplicate state and lag behind optimistic
updates. The pure splitter operates on the same in-memory `pages`
array.
