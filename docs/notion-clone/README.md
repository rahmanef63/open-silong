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

## Completion stats (2026-05-01)

| Doc | Done | Total | % |
| --- | ---: | ---: | ---: |
| `BACKLOG.md` | 404 | 850 | **47.5%** |
| `ROADMAP.md` | 28 | 53 | **52.8%** |

Recompute with: `cd docs/notion-clone && grep -cE '^- \[x\]\|^  - \[x\]\|^    - \[x\]' BACKLOG.md`.

## Current state snapshot (2026-05-01)

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
- 6 views: Table, Board, List, Gallery, Calendar, Timeline
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

**Latest additions (2026-05-01 session)**
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
2. **Rich block coverage:** synced blocks, embeds (Figma/YouTube/Tweet), inline math, button block
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
