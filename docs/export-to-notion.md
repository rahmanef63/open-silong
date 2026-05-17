# Export to Notion — Round-Trip Guide

Nosion ships **two export tracks** so you can move content between
Nosion and Notion without losing the round-trip with itself:

| Track | Format | Use when |
|---|---|---|
| **Notion-compatible** | `.md` · `.html` · `.txt` · `.pdf` · `.csv` · `.zip` | You want to import into Notion. |
| **Nosion-native** | `.json` (per-page or full workspace) | You want a lossless backup or to re-import into Nosion. |

Notion's importer accepts: Plaintext, Markdown, Word, CSV, HTML, PDF,
ZIP — see <https://www.notion.com/help/import-data-into-notion>.

---

## Per-page export

Open any page → **⋯ kabab menu → Data**. Sub-menu items:

| Item | What goes in the file |
|---|---|
| **Markdown (.md)** | Page title + blocks, GFM. Tables, columns, math, embeds, db blocks all render as canonical Notion-MD syntax. |
| **HTML (.html)** | Standalone HTML with inline styles. Best fidelity for Notion paste / import. |
| **Plain text (.txt)** | Title + readable text, no decoration. |
| **PDF (.pdf)** | Browser print → "Save as PDF". Uses the same print stylesheet that hides chrome. |
| **JSON (.json)** | Opens the workspace-io dialog scoped to this page. Nosion-only. |

### Copy page contents (multi-format)

The **Copy page contents** action writes BOTH `text/plain` and
`text/html` to the clipboard via `ClipboardItem`. Paste targets pick
the richest representation they support:

- **Notion paste** → picks `text/html`, preserves headings, lists,
  links, inline marks.
- **Terminal / plain editor** → falls through to `text/plain`.

---

## Workspace ZIP (Notion's "Import → All in one ZIP")

Sidebar → **Import / Export**, **Export** tab. Pick pages → choose
**ZIP (Notion-compatible)** format. Folder layout:

```
nosion-export-YYYY-MM-DD.zip
├─ <PageTitle>.md
├─ <PageTitle>/
│  └─ <ChildPageTitle>.md
├─ databases/
│  └─ <DbName>.csv
└─ _manifest.json     ← Nosion-only, Notion ignores
```

Each `.md` is parsed by Notion as a page; the folder named after the
parent page becomes the parent → child relationship.
`databases/*.csv` are imported as Notion databases — first row is
property names, rows are pages.

### What survives the round-trip

| Nosion concept | Notion after import |
|---|---|
| Page title + icon | ✅ title; icon as text emoji |
| Headings / paragraphs / lists / quotes / code / toggles | ✅ |
| Tables (GFM) | ✅ |
| Columns (2/3/4/5) | ⚠️ rendered sequentially (Notion's MD importer doesn't reconstruct columns) |
| `database` block | ✅ inline GFM table in the page MD (Notion creates a simple table) + sibling `databases/<name>.csv` in ZIP (Notion creates a real database) |
| Math / equation | ⚠️ rendered as `$expr$` text; Notion preserves as text |
| Audio / video / embed | ⚠️ rendered as `[caption](url)` link |
| Page mentions | ⚠️ rendered as `[📄 title](#page-id)` link |
| Select / multi_select | ✅ option **names** preserved (ids discarded) |
| Relations | ⚠️ rendered as row titles (links rebuilt by hand) |
| Rollups / formulas | ❌ values not exported (Notion would recompute anyway) |

### CSV details

`shared/lib/csv.ts:databaseToCsv` emits:

- UTF-8 with BOM (Notion's preferred encoding signal)
- CRLF line endings, RFC 4180 quoting
- Dates → `MM/DD/YYYY` (Notion's expected format)
- Multi-select → comma-joined option names
- Checkbox → `Yes` / `No`
- Currency → prefix code (`USD42`)
- Relations → row titles when known, else ids

---

## Nosion-native JSON

Use this for backups / migration between Nosion instances. Reachable
from:

- Sidebar → **Import / Export** → Export tab → format `JSON`
- Settings → Backup → Download
- Per-page kabab → Data → JSON

Round-trip fidelity: 100% — pages, databases, snapshots, share slugs,
wiki state, mention rewrites all survive `importFromJson` (see
`convex/import/workspace.ts`).

---

## Files involved

| File | Role |
|---|---|
| `frontend/shared/lib/markdown.ts` | `pageToMarkdown` / `pageToPlainText` |
| `frontend/shared/lib/html.ts` | `pageToHtml` (standalone) / `pageToHtmlFragment` (clipboard) |
| `frontend/shared/lib/csv.ts` | `databaseToCsv` / `downloadCsv` — canonical, Notion-strict |
| `frontend/shared/lib/zipExport.ts` | `buildWorkspaceZip` / `downloadWorkspaceZip` |
| `frontend/slices/workspace-io/lib/runExport.ts` | Dispatch layer (format → handler) |
| `frontend/slices/editor/page-actions/DataSubmenu.tsx` | Per-page export menu |
| `frontend/slices/workspace-io/components/ExportTab.tsx` | Workspace export UI |
| `frontend/slices/database-csv/lib/csv.ts` | Slice re-export + CSV parser (import side) |

No new dependencies — JSZip + JSDOM + the ClipboardItem API were
already in the tree.
