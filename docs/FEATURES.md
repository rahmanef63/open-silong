# Feature Tasklist - notion-page-clone

## Already Done
- Table view (DnD rows/columns, sort, filter, search)
- Board view (kanban DnD between columns)
- Calendar view (basic month)
- Gallery view (grid + cover)
- List view (simple)
- Timeline view (placeholder list)
- All property types rendered with mock behavior where backend storage is not available
- Add/delete/hide properties
- Add/delete rows
- Multiple views per database
- Convex backend + auth

---

## Database Features

### Filter System
- [x] FilterBuilder UI - add / edit / delete filters per view
- [x] Filter operators: contains, equals, not_empty, is_empty, checked, unchecked
- [x] Multiple filters (AND logic)
- [x] Filter value input per operator

### Sort System
- [x] SortBuilder UI - add / remove sorts
- [x] Direction toggle asc/desc per sort
- [x] Multi-sort (ordered priority)

### Property Management
- [x] Inline property rename (click header -> popover -> rename input)
- [x] Property type change from header
- [x] Select/Status/Multi-select option: rename, recolor, delete
- [x] Add new select option inline from popover

### View Management
- [x] Rename view (double-click tab)
- [x] Delete view (X button on tab)

### Board View
- [x] Group-by switcher (pick which select/status prop to group on)
- [x] Column reorder (horizontal DnD; persisted via `view.boardColumnOrder`)

### Calendar View
- [x] Prev / Next month navigation
- [x] Jump to today

### Timeline View
- [x] Real Gantt bars (date-start -> date-end using two date props or single date)
- [x] Month header ruler

### Property Cells
- [x] Relation - mock cross-row/page links with picker UI
- [x] Rollup - mock relation aggregates (count, values, sum, checked, latest)
- [x] Formula - mock template/math formulas
- [x] Files - mock attachments by name or URL

---

## Page / Editor Features

### Column Layout Block
- [x] `/2 columns` -> 2-column layout block
- [x] `/3 columns` -> 3-column layout block
- [x] Each column holds independent block list
- [x] All block types supported inside columns (except nested columns)
- [x] Add / delete blocks per column
- [x] Enter to add, Backspace empty to delete

### Toggle / Collapsible Block
- [x] `/toggle` -> collapsible heading block
- [x] Expand / collapse with chevron
- [x] Child blocks inside toggle

### Image Block
- [x] `/image` -> paste URL -> renders `<img>`
- [x] Caption editable below image

### Inline Text Formatting
- [x] Bold / Italic / Strike / Code / Link via floating selection toolbar
      Inserts markdown-style markers (`**…**`, `_…_`, `~~…~~`, `` `…` ``,
      `[label](url)`) into the selected text. Editor shows raw markers
      (Slack model). Public share view + exports parse and render
      formatted output via `inlineMd.tsx`.
