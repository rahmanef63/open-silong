# Library

Route: `/dashboard/library`. Slice: `frontend/slices/library/`.

A Notion-canonical workspace browser: every page in the workspace
grouped into 5 collapsible sections, each rendered as a sortable table
with checkboxes for bulk operations.

## Sections

| Key | Source | Rule |
|---|---|---|
| `recents` | `useStore().recents` | Last 20 visited (from per-user `recents` Convex table). |
| `favorites` | `pages.filter(p => p.favorite)` | Star-toggled pages. |
| `shared` | `pages.filter(p => p.isPublic)` | Pages with `isPublic === true` (publicly shared via slug). |
| `private` | top-level non-public, non-trashed | `parentId === null && !p.isPublic`. |
| `all` | every visible page sorted by `updatedAt` desc | The full catalog. |

Trashed pages and database rows (`rowOfDatabaseId !== undefined`) are
excluded from every section.

Pure splitter: `frontend/slices/library/lib/groupPages.ts:groupPagesForLibrary`
— takes `{ pages, recentIds, recentLimit? }`, returns `LibrarySection[]`.
10 invariant tests in `__tests__/groupPages.test.ts`.

`pageBreadcrumb(page, allPages, workspaceName?)` walks the parent
chain (cycle-safe, depth-capped at 12) for the "Source" column.

## Table columns

`SectionTable.tsx` renders:

| Column | Visible | Source |
|---|---|---|
| ☐ checkbox | always | section-level select-all in header |
| Name | always | `<DynamicIcon>` + title (clickable → page) |
| Created by | `md+` | `user.name ?? user.email ?? "You"` |
| Source | `lg+` | `pageBreadcrumb()` joined with " › " |
| Last edited | `md+` | `formatRelTime(p.updatedAt)` |
| Last visited | `xl+` | rank in `recents` (or "—") |

Default-collapsed: `all` section (unless filter is active). All other
sections default open.

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
`togglePublic`, `deletePage`) — no new Convex endpoint added.

## Filter

A title-substring filter at the top reduces visible pages across all
sections. When active, the `all` section auto-expands.

## Why no Convex query?

All data is already loaded by `StoreProvider` for the sidebar — adding
a `library.list` query would duplicate state and lag behind optimistic
updates. The pure splitter operates on the same in-memory `pages`
array.
