# Notion clone — backlog

> Source: project scope brief (2026-04-30). Mirrors the structure of [Notion Help](https://www.notion.com/help/category/write-edit-and-customize) for Pages & blocks and Databases.
>
> Convention: `[x]` = shipped in this repo, `[ ]` = not yet. Mark inline as you ship.

---

# 0. Product Foundation

## 0.1 Product Requirements

- [ ] PRD utama
  - [ ] Target user: personal note, team wiki, project management, knowledge base
  - [x] Core use cases
    - [x] Create page
    - [x] Block-editor writing
    - [x] Nested page
    - [x] Create database
    - [x] Configure properties
    - [x] Table/board/list/calendar views
    - [x] Upload media
    - [x] Workspace search
    - [x] Share page (public + signed URL)
  - [ ] Non-goals (fase awal): AI assistant, marketplace template, enterprise SSO, public API penuh, mobile native
  - [ ] Feature parity matrix vs Notion
  - [x] Roadmap MVP / V1 / V2 / Scale (lihat `ROADMAP.md`)

## 0.2 Information Architecture

- [x] Struktur data utama
  - [x] User
  - [x] Workspace
  - [ ] Teamspace / space
  - [x] Page
  - [x] Block
  - [x] Database
  - [x] Database row / record
  - [x] Property schema
  - [x] File asset
  - [x] Comment
  - [x] Mention
  - [ ] Permission (granular, per-page)
  - [ ] Activity log
- [x] Relasi
  - [ ] Workspace ↔ banyak members (single-user saat ini)
  - [x] Workspace ↔ banyak pages
  - [x] Page ↔ banyak blocks
  - [x] Block punya children
  - [x] Page bisa jadi database row
  - [x] Database punya schema properties
  - [x] Database row punya property values
  - [x] Page punya parent page
  - [ ] Page punya backlinks (data ada via mentions, panel display belum)

## 0.3 Technical Architecture

- [x] Stack frontend: React 19 + Vite + TypeScript + Tailwind + shadcn/ui (cmdk, Radix)
- [x] Block editor engine: contentEditable + dnd-kit + custom block model
- [x] Backend stack: Convex self-hosted (Dokploy) — mutations/queries/subscriptions
- [x] Auth: `@convex-dev/auth` (PKDF2)
- [ ] WebSocket presence layer — Convex provides reactivity but not collaborator presence
- [x] Database utama: Convex (key-value + indexes)
- [ ] Redis / search engine — not yet (search via in-memory filter on client)
- [x] File storage: Convex storage
- [x] Block storage model: JSON per block, parent_id + order_index, columns/children
- [x] Versioning: snapshot-based (manual + auto-throttled), undo/redo via in-memory stack
- [x] Realtime strategy: optimistic update + last-write-wins (Convex reactive `useQuery`)
- [ ] CRDT / OT for true concurrent editing (deferred to V2)

---

# 1. Authentication & Account

## 1.1 User Auth

- [x] Register (email + password via Convex Auth)
- [ ] Email verification
- [x] Password strength validation (basic via Convex Auth)
- [x] Login (Convex Auth session)
- [ ] Remember me toggle
- [ ] Rate-limit login attempts
- [x] Logout
- [ ] Forgot password
- [ ] Reset password
- [x] Account settings
  - [x] Change name
  - [x] Change avatar
  - [ ] Change email
  - [ ] Change password
  - [ ] Delete account

## 1.2 Workspace Onboarding

- [x] Default workspace on register
- [ ] Onboarding flow (use-case picker, template seed)
  - [ ] Workspace name input
  - [ ] Use-case picker
  - [ ] Template picker
- [x] Default seed pages (Getting Started, Notes-style)

---

# 2. Workspace & Sidebar Navigation

## 2.1 Workspace Model

- [x] CRUD workspace (single-user)
- [ ] Switch workspace (multi-workspace UX)
- [x] Workspace settings
- [ ] Member list
- [ ] Invite member by email
- [ ] Roles
  - [ ] Owner
  - [ ] Admin
  - [ ] Member
  - [ ] Guest

## 2.2 Sidebar

- [x] Sidebar utama
  - [x] Workspace switcher (single-user header)
  - [x] Search button
  - [x] Home
  - [x] Favorites
  - [x] Private pages
  - [x] Shared pages
  - [x] Trash
- [x] Nested page tree
  - [x] Expand / collapse
  - [x] Drag reorder
  - [x] Inline create
  - [x] Inline rename
  - [x] Context menu
  - [x] DragOverlay ghost preview (no horizontal scroll, vertical-axis restricted)
  - [x] Drop indicator line (sibling) + nest highlight (drag right)
  - [x] Cross-context drop: drag page-link from page body → sidebar to re-parent
- [x] Favorite pages
- [x] Recent pages
- [x] Breadcrumb navigation
- [ ] Quick-open command palette (cmdk primitives present, not wired to global ⌘K yet)

---

# 3. Pages & Blocks Core

## 3.1 Page CRUD

- [x] Create page (empty / inside page / inside database)
- [ ] Create page from template
- [x] Read page (metadata + blocks + permissions)
- [x] Update page (title, icon, cover, parent, favorite)
- [x] Delete (soft-delete → trash → restore → permanent delete)
- [x] Archive (re-using trash for now)

## 3.2 Page Metadata

- [x] Title
- [x] Icon (emoji picker)
- [ ] Upload custom icon
- [x] Cover (gradient picker)
- [ ] Upload custom cover image
- [ ] Reposition cover
- [x] Remove cover
- [x] Created time / updated time (Convex `_creationTime`, `updatedAt`)
- [ ] Created by / last edited by (single-user)
- [x] Page path (breadcrumbs)
- [x] Page ID slug

## 3.3 Block Data Model

- [x] Block fields (id, page_id, type, content JSON, order, children, columns)
- [x] Nested blocks (toggle, columns)
- [x] Reorder
- [x] Duplicate
- [x] Soft delete via parent page mutation
- [x] Snapshot-based version history

## 3.4 Block Editor Core

- [x] Editable surface (contentEditable)
- [x] Cursor & selection handling
- [ ] Multi-block selection
- [x] Enter / Shift+Enter / Backspace behaviors
- [x] Slash command
- [x] Drag handle + dnd-kit sortable
- [x] Block context menu
- [x] Placeholder
- [x] Copy / paste
- [ ] Markdown paste auto-convert
- [ ] HTML paste sanitization
- [x] Image / file paste (via FileUploadButton)
- [x] Undo / redo
- [x] Autosave (Convex mutations)
- [x] Optimistic updates (Convex)
- [ ] Conflict handling (last-write-wins only)

---

# 4. Block Types

## 4.1 Basic Text Blocks — P0

- [x] Paragraph
- [x] Heading 1 / 2 / 3
- [x] Bulleted list
- [x] Numbered list
- [x] To-do checkbox
- [x] Toggle
- [x] Quote
- [x] Divider
- [x] Callout
- [x] Page link
- [ ] Link preview placeholder

## 4.2 Rich Text Formatting — P0

- [x] Bold / Italic / Underline / Strikethrough
- [x] Inline code
- [ ] Inline equation
- [ ] Text color
- [ ] Background color
- [x] Link
- [x] Mention page / user / date
- [ ] Clear formatting button
- [x] Floating formatting toolbar (browser default for now)
- [x] Keyboard shortcuts (⌘B / ⌘I / ⌘U / ⌘K)

## 4.3 Layout Blocks — P1

- [x] Columns (2 and 3)
- [x] Drag block into column
- [ ] Resize column
- [ ] Table of contents
- [ ] Breadcrumb block
- [x] Button block (label + URL or page path → opens new tab / navigates internally)
- [ ] Synced block
- [x] Embed block (iframe — auto-detects YouTube/Vimeo/Loom/Figma/CodePen/CodeSandbox/Spotify; generic fallback)

## 4.4 Media Blocks — P1

- [x] Image (upload + URL + caption + alt placeholder)
- [ ] Resize image
- [ ] Download original
- [x] File block (upload + preview + size)
- [ ] Video block
- [ ] Audio block
- [ ] PDF block
- [ ] Bookmark block (URL metadata fetch)

## 4.5 Code Blocks — P1

- [x] Code block
- [x] Language selector (30+ languages)
- [x] Syntax highlighting (highlight.js)
- [x] Copy code button (with ✓ feedback)
- [ ] Line wrapping toggle
- [x] Plain text fallback
- [x] Common languages (JS/TS/Python/PHP/Go/SQL/Bash/JSON/HTML/CSS + 20 more)
- [x] Light/dark code theme (uses github-dark)

## 4.6 Math Equations — P1

- [ ] Inline math
- [x] Block math (LaTeX, click-to-edit)
- [x] LaTeX parser (KaTeX)
- [x] Error state for invalid LaTeX
- [x] Edit equation in-place (with live preview)
- [x] Render with KaTeX

## 4.7 Advanced Blocks — P2

- [ ] Synced block
- [x] Simple table block (with "Turn into database" conversion)
- [ ] Mermaid diagram
- [x] Generic third-party embed (covered by /embed block)
- [x] Figma / YouTube / Loom / Vimeo / CodePen / CodeSandbox / Spotify embeds (provider-aware URL parser)

---

# 5. Writing, Editing & Page Formatting

## 5.1 Markdown Shortcuts

- [x] `#`, `##`, `###` → headings
- [x] `-` → bullet
- [x] `1.` → numbered
- [x] `[]` → checkbox
- [x] `>` → quote
- [x] `---` → divider
- [x] ` ``` ` → code block (space-triggered markdown shortcut)
- [x] `$$` → equation (space-triggered markdown shortcut)
- [x] Auto-convert on space / enter

## 5.2 Page Style

- [x] Small text toggle
- [x] Full width toggle
- [x] Font (default / serif / mono)
- [ ] Block color
- [ ] Block background color
- [x] Page icon
- [x] Page cover
- [ ] Custom cover positioning

## 5.3 Move & Duplicate Content

- [x] Duplicate page
- [x] Duplicate block
- [ ] Duplicate selected blocks (multi-select)
- [x] Move page to another parent
- [ ] Move page to another workspace
- [ ] Move block across page
- [x] Drag block into nested toggle / column
- [ ] Preserve permissions during duplicate
- [ ] Preserve backlinks during duplicate
- [x] Regenerate IDs for duplicates
- [ ] Workspace-access conflict warning

## 5.4 Delete, Restore & Trash

- [x] Soft delete block (via page mutation)
- [x] Soft delete page → trash
- [x] Trash includes nested children
- [x] Restore page with original parent
- [ ] Restore page if parent deleted (orphan handling)
- [x] Permanent delete
- [x] Empty trash
- [ ] Permission check for delete / restore (single-user)
- [ ] Audit log for destructive actions

---

# 6. Links, Backlinks & Mentions

## 6.1 Internal Links

- [x] Link to page
- [ ] Link to block (anchor)
- [x] Copy page link
- [ ] Copy block link
- [ ] Paste internal link auto-converts to mention
- [x] Open link in current / new tab (browser default)
- [ ] Broken-link state if target deleted / no access

## 6.2 Backlinks

- [x] Track backlinks when page mentioned (`@TitleHandle`)
- [x] Track backlinks when page link inserted (page block)
- [x] Backlinks section on page
- [x] Group backlinks by page
- [x] Hide backlinks toggle (collapse panel)
- [x] Permission-aware backlinks (single-user → all owned)
- [x] Remove backlink when mention removed (live derivation, no stale state)
- [x] Update backlink when page title changes (live derivation)

## 6.3 User Mentions

- [x] `@` user mention (single-user, pulls from workspace user)
- [ ] Search workspace members
- [x] Insert mention into block
- [ ] Notify mentioned user
- [ ] Permission-aware suggestions

## 6.4 Date Mentions

- [x] `@date` mention
- [ ] Relative date display
- [ ] Reminder support
- [ ] Calendar popup
- [ ] Due-date integration with task DB

---

# 7. Wikis & Verified Pages

## 7.1 Wiki Mode

- [x] Mark page tree as wiki (toggle in PageActionsMenu)
- [ ] Wiki home page concept
- [ ] Owner / maintainer metadata
- [ ] Verification status
- [ ] Last-verified date
- [ ] Verification expiration / reminder
- [ ] "Verified" badge UI
- [ ] Stale page warning
- [ ] Filter wiki pages by verified state

## 7.2 Knowledge Base UX

- [ ] Wiki search
- [ ] Popular pages
- [ ] Recently updated pages
- [ ] Page owner display
- [ ] Related pages
- [x] Table of contents (limited)
- [ ] Helpful / not-helpful feedback
- [ ] Request-update button

---

# 8. Synced Blocks

## 8.1 Synced Block Core

- [ ] Create synced block
- [ ] Copy synced block to another page
- [ ] Maintain source block ID
- [ ] Edit-anywhere updates all instances
- [ ] Synced block indicator
- [ ] List of synced locations
- [ ] Unsync current / unsync all
- [ ] Permission gates (source vs instance)
- [ ] Conflict handling

## 8.2 Synced Block Edge Cases

- [ ] Delete source / restore source
- [ ] Duplicate page with synced block
- [ ] Move synced block across workspace
- [ ] Export with synced block
- [ ] Offline edit synced block
- [ ] Undo synced edits

---

# 9. Keyboard Shortcuts & Command Palette

## 9.1 Keyboard Shortcuts

- [x] Global shortcut map (basic, in editor)
- [x] Editor shortcut map
- [ ] Shortcut help modal
- [ ] Customize shortcuts
- [x] Core shortcuts
  - [ ] New page (⌘N)
  - [ ] Open search (⌘P)
  - [ ] Command palette (⌘K)
  - [x] Bold / Italic / Underline / Inline code
  - [x] Link
  - [x] Duplicate block (⌘D)
  - [x] Delete block (Backspace on empty)
  - [ ] Move block up / down
  - [x] Undo / Redo (⌘Z / ⌘⇧Z)

## 9.2 Slash Command

- [x] Open with `/`
- [x] Search block type
- [x] Keyboard navigation
- [x] Insert selected block
- [x] Group commands (Basic / Media / Database / Advanced / Inline)
- [ ] Recent commands
- [ ] Permission-aware commands

## 9.3 Command Palette

- [x] Wire ⌘K / Ctrl+K to global palette
- [x] Search pages (live, by title)
- [x] Create new page action
- [x] Navigate to page
- [x] Trigger arbitrary actions (Home / Inbox / Trash / Settings / Theme toggle)
- [ ] Search settings
- [x] Search database records (database list + jump to host page)
- [ ] Recent commands history

---

# 10. Presentation Mode

## 10.1 Presentation View

- [ ] Convert page to fullscreen presentation
- [ ] Split content by heading
- [ ] Slide navigation
- [ ] Keyboard controls
- [ ] Presenter mode
- [ ] Hide sidebar
- [ ] Page title as cover slide
- [ ] Render images / code / math correctly
- [ ] Exit presentation
- [ ] Share presentation URL

## 10.2 Presentation Polish

- [ ] Progress indicator
- [ ] Dark / light mode
- [ ] Responsive slide layout
- [ ] Print / export PDF
- [ ] Speaker notes

---

# 11. Offline Pages

## 11.1 Offline Read

- [ ] Cache recently opened pages
- [ ] Cache page metadata
- [ ] Cache blocks
- [ ] Cache database schema
- [ ] Cache selected database rows
- [ ] Offline indicator
- [ ] Last-synced time
- [ ] Block unsupported actions while offline

## 11.2 Offline Write

- [ ] Local mutation queue
- [ ] Create / edit / delete block offline
- [ ] Create page offline
- [ ] Conflict resolution on reconnect
- [ ] Retry failed sync
- [ ] Sync error state
- [ ] Manual retry button

## 11.3 Offline Storage

- [ ] IndexedDB schema
- [ ] Local encryption review
- [ ] Cache size limit
- [ ] Clear offline data setting
- [ ] Per-page offline pinning

---

# 12. Public Pages & Duplicate Public Pages

## 12.1 Public Sharing

- [x] Share page publicly (ShareDialog)
- [x] Generate public URL (`/share/:id`)
- [x] Disable public URL
- [ ] Allow search-engine indexing toggle
- [x] Public read-only view
- [ ] Permission-safe rendering (hide private backlinks / restricted children)

## 12.2 Duplicate Public Pages

- [ ] "Duplicate" button on public page
- [ ] Login wall before duplicate
- [ ] Choose target workspace
- [ ] Duplicate page tree / blocks / DB schema
- [ ] Optionally duplicate DB rows
- [ ] File policy (duplicate vs reference)
- [ ] Regenerate IDs
- [ ] Handle unsupported blocks
- [ ] Duplicate progress UI

---

# 13. Database Core

## 13.1 Database Model

- [x] Database entity (id, workspace_id, parent, title, icon, schema, default_view)
- [x] Database row entity (database_id, page_id, properties, order_index, timestamps)
- [x] Property schema entity
- [x] Inline database
- [x] Full-page database (via page→database block)
- [ ] Linked database view (separate from source)

## 13.2 Create Database

- [x] Create empty database
- [ ] Create from template
- [x] Default views: Table / Board / List / Calendar / Gallery / Timeline
- [x] Inline / full-page placement
- [ ] Add sample rows option

## 13.3 Database Row / Page Integration

- [x] Every row opens as page (and as Sheet peek)
- [x] Row page shows properties at top (RowPropertiesPanel)
- [x] Row page supports child blocks
- [x] Row title maps to title property
- [x] Deleting row deletes / archives row page
- [x] Moving row preserves DB relation
- [x] Duplicate row with page content
- [x] Restore deleted row

---

# 14. Database Properties

## 14.1 P0 Properties — all shipped

- [x] Title / Text / Number / Select / Multi-select / Status / Date / Person / Checkbox / URL / Email / Phone / Files & media

## 14.2 P1 Properties — all shipped

- [x] Formula / Relation / Rollup / Created time / Created by / Last edited time / Last edited by
- [x] Unique ID
- [ ] Button property

## 14.3 Property Management

- [x] Add property (inline header `+` and properties menu)
- [x] Rename property (inline + menu)
- [x] Delete property
- [ ] Duplicate property
- [x] Reorder property (drag column header)
- [x] Hide / show in view
- [x] Change property type
- [ ] Property-type migration with safe coercion
- [ ] Default value
- [ ] Property description
- [ ] Required property flag
- [ ] Validate property value at write time

## 14.4 Property UI

- [x] Cell editor per property type (PropertyCell with 18-type dispatcher)
- [x] Keyboard navigation in table
- [ ] Bulk edit selected rows
- [x] Drag-fill (vertical, Excel-style fill handle)
- [x] Cell selection ring + click-to-select
- [x] Copy / paste cell (browser default)
- [x] Empty state display
- [ ] Error display for invalid value

---

# 15. Database Views

## 15.1 Table View — P0

- [x] Render rows / columns
- [x] Add row (inline footer)
- [x] Add column (inline rightmost header)
- [ ] Resize column
- [x] Reorder column
- [ ] Freeze title column
- [x] Sort / filter
- [x] Hide properties
- [x] Open row as page (Sheet peek + full route)
- [x] Inline cell editing
- [ ] Pagination / virtualization (no virtualization yet)

## 15.2 Board View — P1

- [x] Group by select / status
- [x] Drag card across groups (updates group property)
- [x] Add card inside group
- [ ] Hide empty groups
- [ ] Customize card preview
- [ ] Board virtualization

## 15.3 List View — P1

- [x] Render compact row list
- [x] Show selected properties
- [ ] Add row inline
- [x] Open row
- [x] Sort / filter

## 15.4 Calendar View — P1

- [x] Group rows by date property
- [x] Month view
- [ ] Week view
- [ ] Drag item to change date
- [ ] Create item by clicking date
- [ ] Overdue / no-date group
- [ ] Timezone handling

## 15.5 Gallery View — P1

- [x] Card grid
- [x] Cover image from page / property
- [x] Show selected properties
- [ ] Card size setting
- [x] Open card as page

## 15.6 Timeline View — P2

- [x] Start / end date property
- [x] Horizontal timeline
- [ ] Drag to adjust date
- [ ] Group by property
- [ ] Dependency lines

## 15.7 View Settings

- [x] Create / rename / delete view
- [ ] Duplicate view
- [x] Set active view
- [x] Per-view filters / sorts / grouping / property visibility
- [ ] Per-view layout settings

---

# 16. Filters, Sorts & Groups

## 16.1 Filters

- [x] Basic filter builder (FilterBuilder)
- [x] Text contains / select equals / multi-select contains / checkbox / date / not-empty / is-empty
- [ ] Filter by person includes
- [ ] Filter by relation includes
- [ ] Filter by formula result
- [ ] AND / OR groups (nested)
- [x] Save filter per view
- [ ] Validate filter when property deleted

## 16.2 Sorts

- [x] Asc / Desc
- [x] Multi-sort
- [x] Sort by text / number / date / select / status / created time / last edited time

## 16.3 Groups

- [x] Group by select / status (board)
- [ ] Group by person / date / relation
- [ ] Manual group order
- [ ] Hide groups
- [ ] Empty group display

---

# 17. Formulas

## 17.1 Formula Engine

- [x] Property type wired
- [x] Tokenizer / arg-splitter (basic)
- [x] Evaluator (substitution + functions + arithmetic)
- [ ] Type system (string / number / boolean / date / list / null) — currently string-coerced
- [x] Property reference resolution (`{{title}}`, `{{Property name}}`)
- [ ] Dependency graph
- [x] Recalculate on property change (Convex reactivity, not graph-based)
- [ ] Circular-dependency guard
- [ ] Cache result
- [x] Error state UI (`Invalid formula` fallback)

## 17.2 Formula Functions — P1

- [x] String: concat / contains / replace / lower / upper / length
- [ ] String: substring
- [x] Number: arithmetic (`= a+b`) / round / floor / ceil / abs / min / max
- [x] Date: now / today
- [ ] Date: dateAdd / dateSubtract / dateBetween / formatDate
- [x] Logic: if / and / or / not / empty
- [ ] List: map / filter / join / sum / count

## 17.3 Formula UI

- [x] Formula editor (popover) on the formula cell
- [ ] Syntax highlighting
- [ ] Property / function autocomplete
- [x] Inline docs (function list shown in editor footer)
- [x] Preview result (live render under expression)
- [ ] Error message with line/position
- [x] Save & recompute (Convex reactivity re-renders on prop change)

---

# 18. Relations & Rollups

## 18.1 Relations

- [x] Create relation property
- [x] Select target database
- [x] One-way relation
- [ ] Two-way relation (auto-add inverse property)
- [x] Relation picker UI
- [x] Search target rows
- [x] Add / remove related row
- [ ] Create new related row from picker
- [x] Show as chips
- [ ] Permission-aware results
- [ ] Handle target DB deleted
- [ ] Handle related row deleted

## 18.2 Rollups

- [x] Create rollup property
- [x] Select relation + target property
- [x] Aggregations: count / sum / average / min / max / earliest / latest / percent-checked
- [ ] Count unique
- [ ] Show original values mode
- [ ] Recalculate on related-row update (currently re-renders on subscription)
- [ ] Cache rollup result
- [ ] Loop guard
- [ ] Error state if dependency removed

---

# 19. Database Settings

## 19.1 Database General Settings

- [x] Rename / change icon / change description
- [x] Lock database (locked flag)
- [x] Duplicate
- [x] Delete (trash → restore → permanent delete from Trash page; cascade row deletion)
- [ ] Move database
- [x] Export database (CSV)
- [x] Import CSV
- [ ] Permission settings
- [x] View-level settings

## 19.2 Schema Settings

- [x] Manage properties (PropertiesMenu)
- [x] Reorder properties
- [x] Hide / show globally
- [ ] Default property values
- [x] Select-option management
- [x] Status workflow management
- [ ] Property-migration warning
- [ ] Schema versioning

## 19.3 Database Locking

- [x] Lock schema editing
- [ ] Allow row edits while schema locked (currently locks all)
- [ ] Restrict view edits
- [x] Locked indicator
- [ ] Admin-only unlock (single-user)

---

# 20. Database Templates

## 20.1 Template System

- [x] Create database template (TemplatesDialog)
- [x] Default properties on apply (rowProps seed)
- [x] Default page content (block list with H2/H3/bullet/todo shortcuts)
- [x] Apply to new row (`addRow(dbId, init, templateId)`)
- [x] Default template setting (star toggle)
- [x] Multiple templates per DB
- [x] Rename / delete / edit template
- [ ] Duplicate template
- [ ] Preview template

## 20.2 Template UX

- [x] New row dropdown with template list (NewRowMenu split button)
- [ ] Apply template to existing row
- [ ] Overwrite confirmation
- [ ] Template variables (today, current user, db name, auto title)
- [ ] Recurring templates

---

# 21. Sub-items & Dependencies

## 21.1 Sub-items

- [ ] Enable sub-items per database
- [ ] Choose parent / child relation property
- [ ] Show nested rows
- [ ] Expand / collapse
- [ ] Add sub-item
- [ ] Move under parent
- [ ] Remove from parent
- [ ] Circular-parent guard
- [ ] Progress rollup from sub-items
- [ ] Filter include / exclude sub-items

## 21.2 Dependencies

- [ ] Enable dependencies per database
- [ ] Blocking / blocked-by relation
- [ ] Add / remove dependency
- [ ] Self-dependency guard
- [ ] Circular-dependency detection
- [ ] Dependency warning
- [ ] Show in timeline
- [ ] Auto-status warnings (Blocked / Ready / At risk)

---

# 22. Task Databases & Sprints

## 22.1 Task Database Preset

- [x] Default task database template (Tasks preset via ⌘K)
- [x] Default properties (Task / Status / Priority / Due / Assignee / Tags / ID / Created)
- [ ] Sprint + Project + Estimate + Actual + Dependencies + Sub-tasks (sub-properties)
- [x] Default views (Board by status / My tasks / Calendar / All) — Sprint board + Overdue not yet

## 22.2 Sprint System

- [x] Sprint database preset (via ⌘K)
- [x] Sprint properties (name, status, start, end, goal, ID)
- [ ] Capacity / velocity properties
- [ ] Link tasks → sprint (relation property setup)
- [ ] Start / complete sprint workflow
- [ ] Move incomplete tasks → next sprint
- [ ] Burndown / sprint report

## 22.3 Project Management

- [x] Project database preset (via ⌘K)
- [ ] Link tasks → projects
- [ ] Project status rollup / progress formula
- [ ] Project timeline
- [x] Project owner / priority / health (On track / At risk / Off track) properties
- [ ] Project dashboard

---

# 23. Data Sources

## 23.1 Internal Data Sources

- [x] Database is reusable as inline source (per-page DatabaseBlock)
- [ ] Linked database view (cross-page)
- [ ] Multiple views from same database (per-page)
- [ ] Sync schema changes across linked views
- [ ] Permission-aware linked DB
- [ ] Delete linked view without deleting source
- [ ] Show source database location

## 23.2 External Data Sources — P2

- [x] CSV import (column → property mapper, 14+ types coerced)
- [x] CSV export (download from view, respects visible+filtered rows)
- [ ] Google Sheets / GitHub issues / Jira sync
- [ ] Webhook ingestion
- [ ] API source
- [ ] Manual / scheduled refresh
- [ ] Sync error state
- [x] Field mapping UI (CsvImportDialog)

---

# 24. Unique ID

## 24.1 Unique ID Property

- [x] Add unique-ID property type
- [x] Configure prefix (`uniqueIdPrefix` per property)
- [ ] Configure number format (zero-pad, hex, etc)
- [x] Auto-increment per database
- [x] Generate on row creation
- [x] Prevent manual duplicate (read-only cell)
- [x] Preserve on update
- [ ] Duplicate-row behavior choice
- [x] Read-only display
- [ ] Filter / sort by ID
- [x] Concurrency-safe (Convex mutation atomic)

## 24.2 ID Backend

- [x] Atomic counter per database (`uniqueIdCounter` field)
- [x] Transaction-safe generation (single-tx mutation)
- [x] Retry on conflict (Convex retries)
- [ ] Migration for existing rows
- [ ] Audit ID generation

---

# 25. Database Performance

## 25.1 Query Performance

- [ ] Database row pagination
- [ ] Cursor-based pagination
- [ ] Virtualized table rendering
- [x] Indexes (Convex automatic; explicit `by_user`, `by_page`, `by_block` etc)
- [ ] Optimize JSONB queries (Convex stores docs)
- [x] Cache database schema (Convex reactive)
- [x] Cache view config
- [x] Lazy load row pages (only when peek opens)
- [ ] Batch property updates
- [x] Debounce cell edits (per-cell editor)

## 25.2 Frontend Performance

- [ ] Virtual scrolling for table
- [ ] Virtual scrolling for long pages
- [x] Memoize block rendering (`React.memo(BlockEditor)`)
- [ ] Lazy render off-screen blocks
- [x] Lazy load media (browser default)
- [x] Optimistic UI (Convex)
- [x] Skeleton loading
- [x] Avoid full-page re-render on block edit (memoized + stable callbacks)
- [ ] Measure editor input latency
- [ ] Target typing latency under 50 ms

## 25.3 Recalculation Performance

- [ ] Formula dependency graph
- [ ] Recalculate only affected rows
- [ ] Rollup background jobs
- [ ] Batch relation updates
- [ ] Cache expensive rollups
- [ ] Invalidate cache on dependency update
- [ ] Queue long-running recomputation

---

# 26. Search

## 26.1 Workspace Search

- [x] Index pages (in-memory, client-side)
- [x] Search by title / content
- [x] Search by database row
- [ ] Search by creator / updated time
- [ ] Permission-aware results
- [x] Recent search (built into store)
- [ ] Highlight matched text
- [x] Quick open (basic)

## 26.2 Search Infrastructure

- [ ] Dedicated search index (Meilisearch / Typesense)
- [ ] Incremental index update
- [ ] Delete from index on page delete
- [ ] Reindex workspace command
- [ ] Index failure retry
- [ ] Search analytics

---

# 27. Collaboration & Realtime

## 27.1 Realtime Editing

- [x] WebSocket-based reactivity (Convex `useQuery`)
- [ ] Presence indicator
- [ ] Active collaborators list
- [ ] Cursor position broadcast
- [x] Block / page / database edits broadcast (via Convex reactivity)
- [ ] Conflict resolution beyond last-write-wins
- [x] Reconnect handling (Convex client)
- [ ] Offline fallback

## 27.2 Comments

- [x] Page comments
- [x] Block comments
- [ ] Inline text-range comments
- [x] Resolve / reopen
- [ ] Mention user in comment
- [ ] Comment notifications
- [ ] Permission-aware comments

## 27.3 Activity Log

- [ ] Track page created / updated
- [ ] Track block edited
- [ ] Track page shared
- [ ] Track database schema changed
- [ ] Track row created / deleted
- [ ] Activity feed UI
- [ ] Filter by user / date / type

---

# 28. Permissions & Sharing

## 28.1 Permission Model

- [x] Workspace-level permissions (single-user; every query gates by `getAuthUserId`)
- [ ] Page-level overrides
- [ ] Database-level overrides
- [x] Public-page permission
- [ ] Guest access
- [ ] Inherited permissions
- [ ] Permission resolver service

## 28.2 Permission Levels

- [x] Full access (single-user owner)
- [ ] Can edit
- [ ] Can comment
- [ ] Can view
- [ ] No access
- [x] Public read-only

## 28.3 Sharing UI

- [x] Share modal (ShareDialog)
- [ ] Invite by email
- [x] Copy share link
- [x] Toggle public access
- [ ] Change member permission
- [ ] Remove member access
- [ ] Show inherited access
- [ ] Warn when exposing nested pages

---

# 29. Import, Export & Backup

## 29.1 Import

- [ ] Markdown import
- [ ] HTML import
- [x] CSV import into database (with type coercion)
- [ ] JSON backup import
- [x] Map CSV columns to properties (CsvImportDialog)
- [ ] Import files (media bundle)
- [x] Import validation (skip empty rows, error per row)
- [x] Import progress UI ("Importing…" state)
- [x] Import error report (toast + dialog inline)

## 29.2 Export

- [x] Export page as Markdown (PageActionsMenu)
- [ ] Export page as HTML
- [x] Export database as CSV
- [ ] Export workspace as ZIP
- [ ] Include media files
- [ ] Export permission check
- [ ] Export progress UI

## 29.3 Backup

- [x] Workspace backup via snapshots (per-page)
- [ ] Workspace-wide backup job
- [ ] Restore from backup
- [ ] Versioned export
- [ ] Admin-only backup

---

# 30. Notifications

## 30.1 Notification Events

- [x] Generic notification creation API (mutations)
- [ ] User mentioned event
- [ ] Page shared event
- [ ] Comment-added event
- [ ] Reply-to-comment event
- [ ] Task assigned
- [ ] Due date reminder
- [ ] Page-verification expired
- [ ] Import / export complete

## 30.2 Notification UI

- [x] Inbox panel
- [x] Unread count badge
- [x] Mark as read
- [x] Mark all as read
- [ ] Notification preferences
- [ ] Email notifications
- [ ] Push notifications

---

# 31. Design System

## 31.1 Core UI Components — shipped via shadcn/ui

- [x] Button / Input / Textarea / Select / Multi-select / Checkbox / Radio / Toggle
- [x] Modal / Popover / Tooltip / Dropdown / Context menu / Tabs / Sidebar / Breadcrumb / Toast / Skeleton / Avatar / Badge
- [x] Date picker
- [ ] Color picker
- [x] Emoji picker (page icon)
- [x] Sheet (used for row peek)

## 31.2 Editor Components

- [x] Block wrapper / drag handle / slash menu
- [ ] Floating formatting toolbar (custom)
- [ ] Mention menu (dedicated dropdown)
- [ ] Link editor modal
- [x] Block menu (dropdown on grip)
- [x] Database cell editor
- [x] Property config (via PropertiesMenu)
- [x] Page icon picker
- [x] Cover picker

## 31.3 Responsive Design

- [x] Desktop layout
- [ ] Tablet polish
- [ ] Mobile web layout
- [ ] Collapsible sidebar
- [ ] Mobile block editor behavior
- [ ] Mobile database fallback
- [ ] Touch drag support

---

# 32. Security

## 32.1 App Security

- [x] Input validation at Convex mutation level (Convex validators)
- [x] Output escaping (React default)
- [ ] XSS protection for paste-as-HTML rich text
- [ ] HTML paste sanitization
- [ ] File upload validation (type / size whitelist)
- [ ] Virus scanning
- [x] CSRF (Convex auth uses Bearer tokens, not cookies)
- [ ] Rate limiting
- [x] Secure headers (Dokploy default)
- [ ] Audit logs

## 32.2 Permission Security

- [x] Server-side `getAuthUserId(ctx)` in every query / mutation
- [x] Per-user index gating (`by_user`)
- [ ] Per-page permission check (currently all-or-nothing per workspace)
- [ ] Per-database permission check
- [x] Prevent accessing deleted pages (via trash flag)
- [x] Prevent public access leak (signed-share-id approach)
- [ ] Prevent backlink leak
- [ ] Prevent search-result leak
- [ ] Test inherited permission edge cases

---

# 33. Testing

## 33.1 Unit Tests

- [ ] Block parser
- [ ] Rich-text serializer
- [ ] Markdown shortcut converter
- [ ] Formula tokenizer / parser / evaluator
- [ ] Permission resolver
- [ ] Database filter / sort engine
- [ ] Unique-ID generator
- [ ] Relation / rollup calculator

## 33.2 Integration Tests

- [ ] Create page with blocks
- [ ] Edit nested blocks
- [ ] Move blocks
- [ ] Delete / restore page
- [ ] Create database / add properties / edit rows
- [ ] Filter / sort view
- [ ] Relation + rollup update
- [ ] Template apply
- [ ] Share page
- [ ] Search indexing

## 33.3 E2E Tests

- [ ] Signup / login
- [ ] Create workspace
- [ ] Create page
- [ ] Slash command
- [ ] Upload image
- [ ] Create database table
- [ ] Create task board
- [ ] Add formula
- [ ] Create relation
- [ ] Public-share page
- [ ] Duplicate public page
- [ ] Offline edit + sync

## 33.4 Performance Tests

- [ ] Page with 1k blocks
- [ ] Page with 10k blocks
- [ ] Database with 10k rows
- [ ] Database with 100k rows
- [ ] Formula recalculation large dataset
- [ ] Rollup large relation
- [ ] Search indexing large workspace
- [ ] Concurrent editors on same page

---

# 34. Observability & Operations

## 34.1 Logging

- [ ] API request logs
- [ ] Error logs (only client-side console for now)
- [ ] Auth logs
- [ ] Permission denial logs
- [ ] File upload logs
- [ ] Background job logs
- [ ] Realtime connection logs

## 34.2 Metrics

- [ ] Page load time
- [ ] Editor input latency
- [ ] Block save latency
- [ ] Database query latency
- [ ] Search latency
- [ ] File upload success rate
- [ ] WebSocket reconnect rate
- [ ] Formula recalculation time
- [ ] Error rate

## 34.3 Admin Tools

- [ ] User lookup
- [ ] Workspace lookup
- [ ] Page debug view
- [ ] Permission debug view
- [ ] Reindex search button
- [ ] Recalculate database formulas
- [ ] Restore deleted content admin tool
