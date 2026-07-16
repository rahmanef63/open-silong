# Slice catalog

Every feature in `frontend/slices/<name>/` is summarised here. Each
slice exposes an `index.ts` barrel that defines its public surface.
Cross-slice imports go **through the barrel only** — never reach into
`<slice>/lib/*` or `<slice>/components/*` from outside.

For deeper docs on individual features, see the dedicated pages in
this folder (`databases.md`, `comments.md`, `mcp.md`, etc.). The
table below is the index.

| Slice | Public API surface | Backend mirror | Deeper doc |
|---|---|---|---|
| [admin-panel](#admin-panel) | `<AdminPanel/>`, `useAdminRole()` | `convex/admin/` | [admin.md](./admin.md) |
| [ai-agent](#ai-agent) | `<AIAgentConsole/>`, `useAIChat()`, `SLASH_COMMANDS` | `convex/agent/` | [ai.md](./ai.md) |
| [analytics](#analytics) | `usePageAnalytics()`, `<AnalyticsPopover/>` | `convex/features/analytics/` | — |
| [backlinks](#backlinks) | `<BacklinksPanel/>`, `useBacklinks()` | `convex/features/mentions/` | — |
| [block-selection](#block-selection) | `<BlockSelectionProvider/>`, `<SelectionToolbar/>`, `<MarqueeOverlay/>` | n/a (local state) | — |
| [code-block](#code-block) | `<CodeBlock/>`, `CODE_LANGUAGES`, `normalizeLang()` | n/a | — |
| [command-palette](#command-palette) | `<CommandPalette/>` (Nosion-bound), `CommandPaletteCore` (renderless) | n/a | — |
| [comments](#comments) | `CommentsProvider`, `useComments()`, `useBlockComments()`, `<CommentDrawer/>` | `convex/features/comments/` | [comments.md](./comments.md) |
| [cover](#cover) | `<CoverBanner/>`, `<CoverPicker/>`, `<AddCoverButton/>`, `parseCover()` | n/a | — |
| [dashboard](#dashboard) | `<Dashboard/>` (route shell) | n/a | — |
| [database-cell-selection](#database-cell-selection) | `useDragFill()`, `<SelectableCell/>` | n/a | — |
| [database-csv](#database-csv) | `<CsvActions/>`, `<CsvImportDialog/>`, `exportDatabaseToCsv()`, `parseCsv()` | n/a | [databases.md](./databases.md) |
| [database-json](#database-json) | `<DataMenu/>`, `<JsonImportDialog/>`, `<AIAssistDialog/>`, `exportDatabase()` | n/a | [databases.md](./databases.md) |
| [database-presets](#database-presets) | `<DatabasePresetPicker/>`, `DATABASE_PRESETS` | n/a | — |
| [database-templates](#database-templates) | `<NewRowMenu/>`, `<TemplatesDialog/>` | `convex/features/databases/` | — |
| [databases](#databases) | `<DatabaseBlock/>`, `<DatabasePage/>`, `<PropertyCell/>`, `PROPERTY_TYPES` | `convex/features/databases/` | [databases.md](./databases.md) |
| [editor](#editor) | `<PageEditor/>`, `<BlockEditor/>`, `<PageActionsMenu/>`, `<RowPropertiesPanel/>`, `useFullPage()` | `convex/pages.ts` | [blocks.md](./blocks.md), [block-controls.md](./block-controls.md), [inline-decorator.md](./inline-decorator.md), [pages.md](./pages.md) |
| [equation](#equation) | `<EquationBlock/>` | n/a | — |
| [feedback](#feedback) | `<FeedbackDialog/>`, `<NewTicketForm/>`, `<UserTicketsList/>`, ticket metadata enums | `convex/features/feedback/` | — |
| [files](#files) | `useFileUpload()`, `useFileUrl()`, `<FileChip/>`, `<FileUploadButton/>`, `FilesAdapterProvider`, `useLocalStorageFilesAdapter()` | `convex/files/` | [files.md](./files.md) |
| [inbox](#inbox) | `useInbox()`, `<InboxPage/>`, `<InboxBadge/>` | `convex/features/inbox/` | [inbox.md](./inbox.md) |
| [library](#library) | `<LibraryView/>`, `groupPagesForLibrary()`, `pageBreadcrumb()` | `convex/pages.ts` | [library.md](./library.md) |
| [mentions](#mentions) | `useMentions()`, `<MentionsPopover/>` | `convex/features/mentions/` | — |
| [mobile-nav](#mobile-nav) | `<MobileBottomNav/>`, `<MoreDrawer/>` | n/a | — |
| [notifications](#notifications) | `useSubscription()`, `<NotifyMePopover/>`, `SUBSCRIPTION_SCOPE_LABELS` | `convex/features/notifications/` | — |
| [notion](#notion) | `NotionAppProvider`, `NotionPage`, `NotionDatabase`, `NotionSidebar` (mega-slice) | n/a | — |
| [search](#search) | `useSearch()`, `<SearchModal/>` | `convex/search.ts` | [search.md](./search.md) |
| [sharing](#sharing) | `<ShareDialog/>` | `convex/sharing.ts` + `convex/http.ts` | — |
| [simple-table](#simple-table) | `<SimpleTableBlock/>` | n/a | — |
| [snapshots](#snapshots) | `<VersionHistory/>` | `convex/snapshots.ts` | [snapshots.md](./snapshots.md) |
| [templates](#templates) | `<TemplateGalleryDialog/>`, `<TemplatePagePreview/>`, `useInstantiateTemplate()` | `convex/templates/` | [templates.md](./templates.md) |
| [theme-presets](#theme-presets) | `<ThemePicker/>`, `<TweakcnSwitcher/>`, `useThemePreset()`, `THEME_PRESETS` | n/a (localStorage) | — |
| [trash](#trash) | `<TrashView/>` | `convex/pages.ts` (soft-delete) | — |
| [wiki](#wiki) | `useWiki()`, `<WikiToggleAction/>`, `<WikiBadge/>` | `convex/wiki.ts` | — |
| [workspace-io](#workspace-io) | `<WorkspaceIODialog/>`, `WorkspaceIOProvider`, `buildSelectionExport()` | `convex/import/` | [import-export.md](./import-export.md) |
| [workspace-members](#workspace-members) | `<MembersDialog/>` | `convex/features/workspaces/` | [workspaces.md](./workspaces.md) |
| [workspace-sidebar](#workspace-sidebar) | `<AppSidebar/>`, `<PagesPanel/>`, `useSidebarDnd()` | n/a (consumes pages/databases queries) | — |

---

## admin-panel

Admin-only routes: overview analytics, users table, audit log,
templates manager, feedback inbox. `useAdminRole()` gates rendering;
real authz lives inside Convex (`requireSuperAdmin` / `requireAdmin`).
Mounted at `/dashboard/admin`. Detailed UX: [`admin.md`](./admin.md).

## ai-agent

LLM chat console with slash commands for editor / database operations
(`/page`, `/db`, `/insert`, `/explain`). `useAIChat()` drives the
streaming conversation; `ActiveContext` describes what the agent
currently has scoped (page, db, selection). Detailed model + tool
contract: [`ai.md`](./ai.md).

## analytics

Page-view + edit counters surfaced via `usePageAnalytics(pageId)` and
an inline `<AnalyticsPopover/>` on the page header. Backend writes are
debounced + sampled per session to avoid hot-mutation thrash.

## backlinks

Inverted index of `@page` mentions. `<BacklinksPanel/>` shows every
page that mentions the current page; `useBacklinks(pageId)` returns
the same data for custom UI. Backed by the `mentions` table indexed
by `by_targetPageId`.

## block-selection

Marquee + click + shift-click multi-block selection for the page
editor. `<BlockSelectionProvider/>` wraps the editor; consumer reads
state via `useBlockSelection()`. `<SelectionToolbar/>` is the
floating bar that wraps the selection with markdown markers (Slack
model — see [`inline-decorator.md`](./inline-decorator.md)).
`<MarqueeOverlay/>` paints the rubber-band rectangle.

## code-block

Syntax-highlighted code block (Shiki). `<CodeBlock/>` is the
renderable; `CODE_LANGUAGES` is the picker list; `normalizeLang()`
normalises legacy / alias values (e.g. `js` → `javascript`).

## command-palette

`Cmd+K` global palette. Two layers:

- `CommandPaletteCore` — renderless, kitab-portable. Consumer feeds
  pre-resolved `groups`. Use this in downstream projects.
- `CommandPalette` (default export) — the Nosion-bound wrapper that
  pulls navigation + page-search + DB-row search groups from the
  store. Used by the dashboard mount.

Also exports `<ShortcutsDialog/>` (the keyboard cheatsheet).

## comments

Threaded comments per block. Renderless `CommentsProvider` +
context hooks (`useComments`, `useThreadComments`) let consumers feed
their own data source. `useBlockComments(blockId)` is the
Convex-bound variant for the in-app editor. Detailed schema +
mutations: [`comments.md`](./comments.md).

## cover

Page cover banner. `<CoverBanner/>` renders the current cover (image
URL, CSS gradient, or unsplash preset). `<CoverPicker/>` is the
selection dialog. `parseCover()` + `coverStyle()` resolve the
storage string into a CSS value. `GALLERY_SECTIONS` is the curated
preset catalogue.

## dashboard

Authenticated route shell. `<Dashboard/>` is the layout mounted under
`/dashboard/*` — it wraps `<RouterProvider basename="/dashboard">`
and renders `<AppSidebar/>` + the active route segment.

## database-cell-selection

Excel-style fill-down on database table cells. `useDragFill()`
returns drag handlers; `<SelectableCell/>` is the wrapper that wires
selection + paste detection.

## database-csv

CSV import/export for databases. `<CsvActions/>` adds the menu items
to the database header; `<CsvImportDialog/>` is the field-mapping
modal. `exportDatabaseToCsv()` + `parseCsv()` are pure utilities the
adapter pattern can reuse without UI.

## database-json

Same shape as `database-csv` but JSON-native (lossless property type
preservation). Adds an AI-assist mode (`<AIAssistDialog/>`,
`generateDatabase()`, `generateRows()`) that calls a configurable
LLM endpoint. API key + model lives in `localStorage` —
`getApiKey()` / `setApiKey()`.

## database-presets

Quick-start templates for new databases (task tracker, sprint board,
project, content calendar, …). `<DatabasePresetPicker/>` is the
modal shown when creating a database; `DATABASE_PRESETS` is the
catalogue.

## database-templates

Per-row templates (Notion-style). Pre-filled property values + child
blocks for repeated entries. `<NewRowMenu/>` adds the "+ New from
template" submenu; `<TemplatesDialog/>` manages the catalogue.

## databases

The core database engine: six views (Table · Board · List · Gallery
· Calendar · Feed), property schema, filter/sort/group, inline embed
+ full-page rendering. Public surface: `<DatabaseBlock/>` (inline /
full-page polymorphic) and `<DatabasePage/>` (route wrapper). See
[`databases.md`](./databases.md) for the full spec.

## editor

Block-based page editor — the central slice. `<PageEditor/>` is the
route entry, `<BlockEditor/>` is the recursive block list,
`<PageActionsMenu/>` is the page-level `⋯` menu, and
`<RowPropertiesPanel/>` renders the database-row sheet. Major
sub-areas have dedicated docs: [`blocks.md`](./blocks.md),
[`block-controls.md`](./block-controls.md),
[`inline-decorator.md`](./inline-decorator.md),
[`pages.md`](./pages.md).

## equation

`<EquationBlock/>` — KaTeX-rendered math block. Inline math is
handled by the inline decorator (`$…$` markers).

## feedback

User-submitted bug reports + feature requests. `<FeedbackDialog/>`
hosts the form; admins read the inbox via the admin panel. Ticket
metadata enums (`KIND_META`, `STATUS_META`, `PRIORITY_META`) are
exported so the admin slice can render the same labels.

## files

Pluggable file storage. The default `convexAdapter.tsx`
(skip-listed for downstream lifts) uses Convex file storage; the
shipped `useLocalStorageFilesAdapter()` lets downstream consumers
run without a backend; an S3 adapter is straightforward to add.
Public surface: `useFileUpload()`, `useFileUrl()`, `<FileChip/>`,
`<FileUploadButton/>`. Detailed adapter contract: [`files.md`](./files.md).

## inbox

Notification feed. `useInbox()` returns the current user's
notifications (mentions, comments, share invites). `<InboxPage/>` is
the `/dashboard/inbox` route; `<InboxBadge/>` is the sidebar unread
count. Detailed schema: [`inbox.md`](./inbox.md).

## library

`/dashboard/library` — Recents / Favorites / Shared with me /
Private / All sections + bulk action bar. `groupPagesForLibrary()`
is the pure grouping function; consumers can render their own UI.
Detailed UX: [`library.md`](./library.md).

## mentions

`@page` autocomplete inside the editor. `useMentions(query)` returns
ranked page suggestions; `<MentionsPopover/>` renders the picker.
Inserts a structured mention into the block stream that the
backlinks slice resolves.

## mobile-nav

Mobile-only bottom-nav + drawer. `<MobileBottomNav/>` is the
fixed-position 5-tab bar; `<MoreDrawer/>` is the overflow sheet.
Hidden on `md:` and up.

## notifications

Per-page subscription model — opt in to comment / mention / edit
notifications on a specific page. `useSubscription(pageId)` returns
state; `<NotifyMePopover/>` is the bell-icon picker.

## notion

**Mega-slice.** Bundles editor + databases + templates + workspace-io
+ wrappers as a single drop-in for embedding inside other React
projects. `NotionAppProvider` mounts the router + workspace IO
context; `NotionPage` / `NotionDatabase` / `NotionSidebar` are the
top-level components. Use this when you want the whole experience as
a single import, not when you want to compose your own subset.

## search

Full-text search across pages + databases. `useSearch(query)` returns
typed `SearchResult` unions (`SearchPageHit` / `SearchDatabaseHit`).
Backed by Convex's search index on `pages.text` and
`databases.title`. Detailed result shape: [`search.md`](./search.md).

## sharing

Public read-only share links. `<ShareDialog/>` manages: enable /
disable, copy URL, optional password, optional expiry, wiki mode
toggle. Public HTTP route lives in `convex/http.ts` (`/share/:slug`)
and renders a stripped-down page that mirrors `<PageEditor/>` in
read-only mode.

## simple-table

`<SimpleTableBlock/>` — lightweight static table block (not a
database). Rows / columns are stored as nested block arrays; useful
for non-queryable lists.

## snapshots

Version history per page. `<VersionHistory/>` is the diff drawer;
snapshots are written manually + on a daily cron (see
`convex/maintenance.ts`). Restore is destructive — fires a structural
action so undo brings the new state back. Detailed schema:
[`snapshots.md`](./snapshots.md).

## templates

Page templates (full-page starter content, not row templates).
`<TemplateGalleryDialog/>` is the catalogue browser;
`useInstantiateTemplate()` is the apply hook. `summarizeTemplate()`
+ `walkTemplateTree()` are pure utilities for previews. Detailed UX:
[`templates.md`](./templates.md).

## theme-presets

Visual theme presets. Two layers:

- `THEME_PRESETS` — built-in palette catalogue, `<ThemePicker/>`
  renders the simple picker, `useThemePreset()` applies via CSS
  vars.
- `<TweakcnSwitcher/>` — fetches ~36 community presets from a
  registry JSON and applies the same way. `<ThemeColorSync/>` keeps
  Tailwind colour vars in sync with the active preset.

Both persist to `localStorage` under `nosion:theme-preset`.

## trash

`/dashboard/trash` — soft-deleted pages + databases. `<TrashView/>`
is the route. Items live 30 days then get hard-deleted by the daily
cron (`convex/maintenance.ts`). Restore is a single mutation that
clears the `trashed` flag.

## wiki

Wiki mode — toggles a page (and optionally its subtree) into a
read-only-for-non-owners surface with a banner + editorial metadata.
`useWiki(pageId)` returns the current state; `<WikiToggleAction/>`
fires the toggle; `<WikiBadge/>` paints the indicator chip.

## workspace-io

Unified export / import. `<WorkspaceIODialog/>` has JSON + ZIP tabs;
`WorkspaceIOProvider` makes the dialog mountable from any sidebar /
menu via `useWorkspaceIO().openDialog()`. `buildSelectionExport()`
is the pure builder for client-side export. Detailed five-phase ID
remap on import: [`import-export.md`](./import-export.md).

## workspace-members

Per-workspace member management. `<MembersDialog/>` lists members +
invites + role pickers. Backend enforces roles via
`requireWorkspaceMember`. See [`workspaces.md`](./workspaces.md) for
the model.

## workspace-sidebar

The left rail mounted by `<Dashboard/>`. `<AppSidebar/>` is the
outer shell; `<PagesPanel/>` renders the page tree;
`useSidebarDnd()` powers drag-to-reorder + drag-to-parent. Built on
`@dnd-kit` with collision detection scoped to sibling rows.

---

## Adding a new slice

1. `mkdir frontend/slices/<name>/{components,hooks,lib,types.ts,index.ts}`
2. (Backend?) `mkdir convex/features/<name>` with `_schema.ts`,
   `queries.ts`, `mutations.ts`.
3. Add a row to the table at the top of this file.
4. If it needs a dedicated doc (>1 paragraph), add
   `docs/api/<name>.md` and link it from the table.

See [`CONTRIBUTING.md`](../../CONTRIBUTING.md#slice-contract) for the
slice contract.
