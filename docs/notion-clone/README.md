# Notion clone — backlog & roadmap

Tracking doc for the Notion-clone build. Hierarchy:

| File | Purpose |
| --- | --- |
| `README.md` | Scope, assumptions, current-state snapshot, navigation |
| `BACKLOG.md` | Detailed task checklist, sections 0–34. Source of truth for "what's left". Mark `[x]` when shipped. |
| `ROADMAP.md` | Release phases (MVP → V1 → V2 → Scale). Promotes items from BACKLOG into a sprint. |
| `PROCESS.md` | Kanban columns, task properties, Definition of Done, ordering of foundational work. |

Reference: this backlog tracks the full feature surface of [Notion Help → Pages & blocks](https://www.notion.com/help/category/write-edit-and-customize) and Databases (formulas, relations, rollups, templates, sprints, data sources, performance, unique ID).

Cross-links inside the repo:

- `.claude/RULES.md` — non-negotiable architecture/style rules
- `.claude/ARCHITECTURE.md` — slice anatomy
- `.claude/DEBT.md` — tracked deviations from the rules
- `docs/FEATURES.md` — high-level feature descriptions

---

## Scope assumptions

**Target product:** web app, Notion-like, with workspace, pages, block editor, database, formula, relation, media, permission, offline support, project/task database.

**Priority labels** (used inside BACKLOG):

| Label | Meaning |
| --- | --- |
| **P0 / MVP** | wajib agar app bisa dipakai |
| **P1 / V1** | penting untuk pengalaman mirip Notion |
| **P2 / Advanced** | kompleks, bisa ditunda |
| **P3 / Enterprise/Scale** | skala besar |

---

## Completion stats (2026-05-02)

| Doc | Done | Remaining | Total | % |
| --- | ---: | ---: | ---: | ---: |
| `BACKLOG.md` | 435 | 417 | 852 | **51.1%** |
| `ROADMAP.md` | 28 | 25 | 53 | **52.8%** |

Recompute with: `cd docs/notion-clone && grep -cE '^- \[x\]\|^  - \[x\]\|^    - \[x\]' BACKLOG.md`.

## Current state snapshot (2026-05-02)

The codebase already covers a usable single-user MVP plus most of the V1 surface. Items below are confirmed shipped:

**Foundation & infra**
- Convex self-hosted backend, Vite + React 19 + TS frontend
- Slice architecture under `src/slices/<name>/` (feature isolation)
- ErrorBoundary at root + per-view; lazy-loaded routes & DB views; Skeleton fallbacks
- Memoized store, centralized comments, `React.memo(BlockEditor)` (perf overhaul)

**Auth & workspace**
- Convex Auth (email + password, PKDF2 hashed)
- Single workspace per user, sidebar with Favorites / Recent / Private / Shared / Trash
- Breadcrumbs, page tree (expand/collapse, drag reorder, inline create/rename), recent pages

**Pages & blocks**
- Page CRUD + soft-delete + restore + permanent delete + duplicate + favorite + lock
- Page metadata: icon (emoji picker), cover (gradient/image), font (default/serif/mono), small text, full width
- Block model w/ children & columns; drag-and-drop reorder; undo/redo (structural + text)
- Slash command, drag handle, dnd-kit sortable, autosave (Convex)
- Block types: paragraph, h1/h2/h3, bullet, numbered, todo, toggle, quote, divider, callout, page link, columns2/3, image, database
- Inline formatting: bold, italic, underline, strikethrough, inline code, link, mention page/user/date
- Markdown shortcuts: `#`, `##`, `###`, `-`, `1.`, `[]`, `>`, `---`

**Database**
- CRUD + 18 property types (text, number, select, multi-select, status, date, person, checkbox, url, email, phone, files, relation, rollup, formula, created_time, created_by, last_edited_time, last_edited_by)
- 11 views: Table, Board, List, Gallery, Calendar, Timeline, Chart, Dashboard, Feed, Map, Form
- Per-view column visibility (`view.hiddenPropIds`) — independent of global hide
- Filters, sorts, board group-by, view tabs (rename/delete/add)
- Inline title editor, hover "Open" peek (right-side Sheet), inline `+ Add column` header, inline `+ Add row` footer (no route nav)
- Row → page integration (every row is a page with subblocks)
- Lock database, duplicate, properties manager

**Collaboration & sharing**
- Public sharing dialog with signed URL + read-only `/share/:id` route
- Comments (page-level + block-level) with resolve/edit/delete, centralized fetching
- Inbox notifications + unread badge
- Snapshots / version history with restore
- Wiki toggle, page analytics (block/word/char counts), Notify-me subscriptions, @-mentions extraction

**Files**
- Convex storage upload, file chips, parse `storage:<id>:<filename>` refs

**Performance & reliability**
- Bundle code-split: main 389 KB gzipped → 122 KB; views/routes 0.6–7.7 KB chunks
- Stable callbacks (`focusByOffset`), Map-based O(1) lookups, memoized derived collections
- ErrorBoundary recovers from view crashes without nuking the page

**Audit hardening (current session, post-feature)**
- **#1 Bulk-select toolbar lifted** — `RowSelectionProvider` / `RowSelectionToolbar` / `RowSelectionKeyboard` moved from TableView up to DatabaseBlock; toolbar now persists across all 11 views (was Table-only)
- **#2 Calendar drag preserves duration** — drop on a new day shifts both `calendarDateProp` and `calendarEndProp` by the same delta; multi-day events stay multi-day
- **#3 Duplicate view is independent** — `structuredClone` on the source so editing one view's filters/sorts/hidden/role-prop arrays no longer leaks into the duplicate
- **#4 CSV relation skips trashed pages** — `valueFromString` filters `!p.trashed` before title→id matching
- **#5 CSV mapping disables computed types** — existing rollup/formula/created_*/last_edited_*/unique_id and person/files options render `disabled` so they can't be selected (silent no-ops removed)
- **#6 Bulk ops respect page lock** — `RowSelectionToolbar` skips `page.locked` rows for both bulk delete and bulk edit; toolbar shows "N locked" amber badge
- **#7 Timeline edge resize clamps** — drag end before start (or start past end) is clamped, dates can't flip
- **#8 Person/files CSV import returns null** — no fake-id strings written; both types removed from "+ Create new" submenu (real ids needed)
- **#9 deleteProperty cascades** — strips propId from every view's `hiddenPropIds`, `sorts`, `filters`, all role-prop arrays (`boardCardProps` / `galleryCardProps` / `listSummaryProps` / `feedSummaryProps` / `formRequiredProps` / `formShownProps` / `dashboardKPIs` / `dashboardBreakdowns`) and clears all `*Prop` singletons that pointed at it (`groupBy`, `boardColorByProp`, `galleryCoverProp`, `calendarDateProp`, `calendarEndProp`, `calendarColorByProp`, `timelineStartProp`, `timelineEndProp`, `timelineColorByProp`, `chartXProp`, `chartYProp`, `mapLatProp`, `mapLngProp`, `mapPinColorProp`)
- **CSV new-property race fixed** — earlier loop of `addProperty(...)` calls each read the same stale `databaseMap` snapshot → last-write-wins → only one prop survived. Now batched into a single `updateDatabase({ properties: [...db.properties, ...newProps] })` call so every "+ Create new" mapping lands, even when its CSV cells were empty
- **CSV option dedupe is case-insensitive** — `"High"` and `"high"` collapse to one option (first-seen casing preserved)

**Feature additions (current session)**
- **5 missing views shipped** — Chart (recharts: bar/line/area/pie/donut + legend/grid/topN/sort/palette/decimals/title/labels), Dashboard (KPI tiles + breakdown bars + recent rows), Feed (chronological timeline), Map (mock geo plot via lat/lng props with pin colour), Form (public-facing input form with required/shown props + success message)
- **Per-view column visibility** — `DatabaseViewConfig.hiddenPropIds`; hiding a column in one view never affects another
- **Reusable QuickCreateDialog** — Title input + Accordion (primary "Properties" + "Hidden in this view"); shared by Calendar/List/Gallery/Feed/Map/Timeline/Board "+ create row" actions; backed by `PropertyFormInput` (also used by FormView)
- **Calendar week-mode + drag + overdue panel** — segmented Month/Week toggle; drop event onto another day to update its date; overdue + no-date OverflowPanel
- **Timeline drag-to-adjust** — pixel-precise pointer drag: move bar (shifts both start+end), or grab edge handle to resize start or end alone
- **Duplicate view** — active-tab kabab → Duplicate clones config + activates
- **Bulk edit** — RowSelectionToolbar "Edit" popover sets a property value across the selected rows (with Clear / Apply)
- **CSV import — full type list** — mapping dropdown gains "+ Create new property" submenu over all writable types incl. relation; new select/multi/status props auto-seed options from CSV cells; relation resolves by row title; computed types (rollup/formula/created_*/last_edited_*/unique_id) skipped
- **TableView row checkboxes** — header master checkbox (checked / indeterminate / clear) + per-row checkbox in widened gutter; integrates with existing RowSelectionProvider
- **Tab activate / menu split** — clicking a view tab no longer auto-opens its menu; kabab only shown on the active tab
- **Database block survives container drop** — `NestedBlock` now has a `case "database"` and threads `pageId` through Toggle/Column panes (was data-loss before)
- **Database area skips block-marquee** — `data-database-block-root` + `skipSelector` on `MarqueeOverlay` so kanban DnD doesn't trigger block selection

**Previous (2026-05-02 session)**
- **Nested containers up to 5 levels** — toggles and column blocks (`columns2` / `columns3`) can now live inside other toggles/columns. `ColumnBlockEditor` is now pure-callback (`onUpdate(patch)` instead of `pageId`), and `ToggleBlock` was split into a `ToggleContent` body + thin top-level shell wrapper. `NestedBlock` recurses into both with depth tracking; at depth > 5 it shows an amber "max nesting reached" pill so the editor never blows the stack.
- **Notion-style columns** — invisible borders + on-hover divider line between panes; hover-to-reveal grab handle that drags to redistribute width (existing `colWidths` storage). `ColumnBlockEditor` now uses `group/cols` + `group/divider` for hover layering.
- **Cursor-jump fix** — `BlockEditor` / `NestedBlock` useEffects now skip DOM sync while the element is `document.activeElement`. `ToggleBlock` heading switched from `{block.text}` child to ref-based pattern. Cures the "cursor flies to position 0 while typing fast" bug caused by every keystroke firing a Convex round-trip that re-rendered with echoed text.
- **Search ranking polish** — title hits now sort above body hits (Convex BM25 still orders within each group).
- **Block color + background** — 10-color Notion palette (gray/brown/orange/yellow/green/blue/purple/pink/red + default). Submenu in the block-controls dropdown picks text color and bg independently. Tailwind class literals live in `slices/editor/lib/colors.ts` so JIT scans them.
- **Block multi-select via drag-marquee** — `slices/block-selection/` + shared `Marquee` primitive in `shared/components/Marquee.tsx`. Two activation paths: (a) press in non-text space (gutter / between blocks / page background) and drag past 4 px → marquee starts immediately; (b) press-and-hold inside a paragraph / heading / any contentEditable for ~320 ms without moving → marquee enters with a 0×0 rect at the press point so the long-press alone selects the block under the cursor, drag from there expands. Moving more than 6 px before the long-press fires cancels the gesture so normal text-selection still works. Shift/⌘ at drag start = additive. Floating bottom toolbar offers Duplicate / Turn into / Color / Bg / Delete / Clear. Esc clears, Backspace/Delete batch-deletes, ⌘D batch-duplicates. Click outside the selection UI clears.
- **Grip / menu split** — BlockControls now exposes a separate `MoreHorizontal` (⋯) button for the Radix DropdownMenu and a drag-only `GripVertical` button. Eliminates the previous Radix-vs-dnd-kit pointerdown collision where dragging a selected block group also popped open the menu.
- **Database row multi-select** — `slices/database-row-selection/` reuses the same `Marquee` primitive. Drag-band in TableView selects rows (selected rows get a brand ring + bg fill). Bottom toolbar shows row count + Delete + Clear. Esc/Backspace/Del wired. Same drag/Shift behavior as blocks.
- **Multi-block move** — `lib/multiMove.ts` (11 unit tests). With multiple top-level blocks selected: ⌘/Ctrl + Shift + ↑ / ↓ slides the group together (preserving relative order, compacting non-contiguous selections — matches Notion). Dragging any selected block via dnd-kit treats the drag as a group: drop on a sibling reorders all selected to that position; drop on a `col:*` / `toggle:*` droppable appends all selected to that container's pane / children. Click anywhere outside the selection UI now clears (Notion-style).
- **Block clipboard** — ⌘/Ctrl + C / X / V on a multi-selection. Custom MIME `application/x-notion-clone-blocks` carries the JSON payload (preserves type, formatting, nested children/columns); `text/plain` is co-written so external apps get readable output. Paste re-generates ids recursively (no collisions on intra-page paste) and inserts after the last currently-selected block — or at the end if nothing selected. Native copy/paste in contentEditable still works untouched (handler checks `document.activeElement` first).
- **aria-hidden console-noise mute** — `AppShell` runs a `MutationObserver` on `body` for `aria-hidden` flips. When Radix Sheet/Dialog opens and marks an ancestor of the currently-focused element as hidden, we blur the focus before Chromium logs the warning. No behavioral change beyond muting the cosmetic console message.
- **Block renderer registry** (`src/slices/editor/blocks/registry.tsx`) — `BLOCK_RENDERERS` maps `BlockType → ComponentType<BlockRendererProps>`. Both top-level `BlockEditor` and nested `NestedBlock` consume it. Adding a leaf block = 1 entry; previous 7-branch if/else collapsed to a single dispatch.
- **Standardized block component contract** — `BaseBlockProps { block, onUpdate }` + `BlockRendererProps` (`onReplace?`, `registerRef?`) in `src/shared/types/block.ts`. `ImageBlock` + `SimpleTableBlock` no longer couple to `pageId` + `useStore` — pure callback components.
- **Nested block DnD fully wired** — `NestedBlock` is now `useSortable` with a `GripVertical` handle and `isOver` indicator line. `ColumnPane` + `ToggleBlock` wrap children in `<SortableContext>`. Reorder inside toggle/column, drag between columns, drag out to top level, drag in from top — all six tree-move cases covered.
- **Tree-aware DnD core** (`src/slices/editor/lib/blockTree.ts`) — `findLocation` / `removeAt` / `insertAt` / `moveBlock` over the recursive block structure (top + columns + toggle children). 14 unit tests.
- **Collision priority** (`src/slices/editor/lib/collisionPriority.ts`) — pure helper that picks leaf-block hits first, suppresses container's own sortable id when its inner droppable is present, falls back to container droppables. Fixes the bug where dropping inside a toggle was misread as top-level reorder of the toggle. 7 unit tests.
- **Slash menu inside nested blocks** — type `/` inside a toggle/column child to convert it (toggle/columns2/columns3 also seed children/columns).
- **Slice type discipline** — 7 slices migrated from flat `types.ts` to `types/index.ts`; new `types/` for `code-block`, `equation`, `simple-table`. `simple-table` extends shared `BlockRendererProps` for DRY.

**Earlier this session**
- **Sidebar DnD polish** — DragOverlay ghost (no original-row jump), vertical-axis restricted (no horizontal scroll), drop-indicator line for sibling drops, brand ring for nesting (drag right ≥ 28px), smooth color transitions
- **Cross-context page drag** — drag a page-link block (from page body or "Pages inside") into the sidebar to re-parent: drop on a row to nest under it, drop on the "Workspace" section header to move to root
- **Cell selection + drag-fill** — Excel/Sheets-style: click a cell to select, drag the bottom-right brand dot to copy the value vertically across rows
- **Simple table block (`/table`)** — plain rows × cols grid with editable header toggle, add/delete rows + cols, and **Turn into database** that materializes a real database with text properties + a Table view + seeded rows
- **Full-page database mode** — when a page contains exactly one database block, the page automatically renders full-width with the database's name as the page title (Notion-style standalone DB pages)
- **Database trash** — sidebar context-menu "Move to trash" sends DBs to the Trash page with restore + permanent-delete; banner UI when viewing a trashed DB

**Earlier**
- **Database templates** — per-DB saved row presets with body blocks + property values; default-template flag; managed via "New ▼ → Manage templates"
- **Database presets via ⌘K** — one-click `Tasks / Sprints / Projects` databases pre-configured with properties, views, status workflows, default templates, ID prefixes
- **CSV import** — column → property mapper dialog, type coercion (date / number / select / multi-select / checkbox / text), skips empty rows
- **CSV export** — download from any view; respects active filters & sorts
- **Formulas extended** — 18 functions: `if/and/or/not/empty/concat/contains/replace/lower/upper/length/round/floor/ceil/abs/min/max/now/today` + property substitution + arithmetic; inline docs in editor

**Previous session additions**
- Code block (`/code`) — highlight.js, 30+ languages, GitHub-dark theme, copy button
- Equation block (`/equation`, `/math`) — LaTeX via KaTeX with live preview
- Backlinks panel — auto from `@title` mentions + page-link blocks
- Global ⌘K palette — page search, favorites, recents, databases, actions
- Unique ID property — atomic counter per database with optional prefix

See `BACKLOG.md` for the full checklist with `[x]` marking shipped work and `[ ]` marking what's left.

---

## What's notably missing

These are the largest gaps before this can claim "Notion parity":

1. **Multi-user collaboration:** workspace invites, roles (admin/member/guest), realtime presence, conflict resolution
2. **Rich block coverage:** synced blocks, inline math (embed + button blocks shipped)
3. **Code/math markdown shortcuts:** ` ``` ` → code, `$$` → equation (slash command works)
4. **Formulas & rollups:** parser/evaluator + dependency graph + UI editor
5. **Offline:** service worker, IndexedDB cache, mutation queue, conflict reconciliation
6. **Presentation mode:** fullscreen slide split-by-heading
7. **Wiki verification:** owner metadata, last-verified date, stale-page warnings
8. **Sub-items & dependencies:** recursive parent/child relations + blocking edges
9. **Task/sprint preset:** seeded task DB with status workflow, sprint DB with burndown
10. **Import/export:** Markdown/HTML/CSV/ZIP with media bundling
11. **Unique ID property:** atomic counter per database
12. **Search infrastructure:** dedicated index, ranking, permission-aware results

These map to specific items in `BACKLOG.md` — none are blocked, all are individually shippable.
