# Import / Export API

Three round-trip surfaces: **JSON workspace** (Settings → Backup),
**CSV** (per-database), **ZIP** (Notion-style exports). Plus
single-page **Markdown** export.

Source:
- `convex/import/workspace.ts` — JSON workspace (mutation)
- `convex/import/zip.ts` — ZIP archive (action, "use node")
- `convex/import/markdown.ts` — Markdown parser (helper)
- `convex/import/internal.ts` — internal mutations called by zip/workspace
- Frontend: `frontend/shared/lib/markdown.ts` — Markdown serializer
- Frontend: `frontend/slices/database-csv/` — CSV import dialog
- Frontend: `frontend/slices/database-json/` — DB JSON export

---

## JSON workspace round-trip

### Export (frontend, no Convex call)

`frontend/shared/lib/markdown.ts:downloadFile` writes a JSON object
client-side. Shape:

```ts
{
  version: 1,
  exportedAt: ISO8601,
  workspace: { name, emoji },
  preferences: Preferences,
  pages: PageImport[],          // max 500
  databases: DatabaseImport[],  // max 50
}
```

`PageImport` excludes `userId`, `_id`, `createdAt`, `updatedAt` —
the import re-mints those.

### Import — `importFromJson({json: string})` mutation

Server-side. Auth: `requireAuth`. Rate-limited: **3 / minute**
(`scope: import.workspace`). Size cap: **8 MB**.

**Validation**: zod (`ImportSchema`). Re-validates server-side
because the JSON is user-supplied and could be hand-edited.

**Four-phase ID remap**:

```
Phase 1: insert pages with parentId=null, capture {oldId → Id<"pages">} map
Phase 2: insert databases, capture {oldId → Id<"databases">} map
Phase 3: patch pages — re-attach parentId / rowOfDatabaseId / blocks
         (blocks are walked recursively; pageId / databaseId fields are
         remapped via the maps from phases 1+2)
Phase 4: patch databases with remapped rowIds
```

Why four phases: blocks reference pageId/databaseId, databases
reference rowIds, pages reference parentId/rowOfDatabaseId — none of
these new ids exist until inserts complete. Forward-references
across the same call would fail.

**Caps**:
- 500 pages, 50 databases per file
- 2 000 blocks per page
- 200 properties / 50 views / 5 000 rowIds per database

**Additive** — never carries:
- `isPublic` (you don't want a backup to silently re-publish)
- `trashed` (restoring trash is meaningless)
- `userId` (re-minted from auth)

**Returns** `void`. Throws plain Error on validation failure.

---

## CSV per-database round-trip

### Export

Frontend-only. `frontend/slices/database-csv/lib/exportCsv.ts`
serializes the active view (respects filters + sorts) into a CSV.
Type-aware (date → ISO, multi_select → semicolon-joined option
names).

### Import

UI: `frontend/slices/database-csv/components/CsvImportDialog.tsx`.
Maps each CSV column → property. Type coercion happens on the client;
each row creates a page via `databases.addRow` (so per-row
ownership is enforced via the standard mutation surface).

**Per-column behavior**:
- `text / url / email / phone` — string
- `number` — `Number(value)`
- `date` — ISO 8601 (validated)
- `select / status` — match by option name (creates new option if
  unrecognized AND mapping was "+ Create new property")
- `multi_select` — split on `;` or `,`, match each
- `checkbox` — `true / yes / 1` → true; `false / no / 0` → false
- `relation` — match by row title; trashed pages skipped (cycle-3)
- `rollup / formula / created_* / last_edited_* / unique_id` — skipped (computed)
- `person / files` — skipped (no real ids in CSV)

Empty rows skipped. Race fixed in cycle-3: "+ Create new property"
mappings batch into a single `update(dbId, {properties: [...db.properties, ...newProps]})`
call so every new prop lands.

---

## ZIP archive (Notion exports + bulk imports)

### Import — `importZip({storageId, parentId})` action

`convex/import/zip.ts`. Action (server-side `"use node"`) because
it uses Node-only `fflate` for gzip + `JSZip` for archive parsing.

**Caller flow**:
1. Frontend uploads ZIP via `generateUploadUrl` + POST → gets `storageId`
2. Frontend calls `importZip(storageId, parentId)` action
3. Action returns `{importedPages, importedDbs, skipped, errors}` summary

**Self-hosted gotcha**: when behind Traefik, the action sometimes
receives the blob still gzipped (proxy decoded but not unwrapped).
The action auto-detects via magic bytes (`1F 8B`) and gunzips before
ZIP parsing.

**Caps**:
- 50 MB per ZIP
- 5 000 entries per ZIP
- 1 MB per text file inside ZIP
- 25 MB per binary file inside ZIP

**Per-entry handling**:
- `.md` → parsed via `import/markdown.ts`, inserted as a new page
- `.csv` → new database with auto-detected schema (text properties,
  Table view); rows seeded
- `.html` → sanitized + converted to block list; new page
- `.pdf` / images / other binaries → uploaded to `_storage`,
  recorded via `recordFileOwnership`, appended as blocks under a
  shared "Imported files" page
- Folders preserved as parent pages so the sidebar tree mirrors
  the ZIP structure

**Auth**: `getAuthUserId` (anonymous → throws "Belum login"). Each
internal mutation call (`createPage`, `appendBlocks`, etc.) verifies
ownership of the storage blob too.

### Export

Not implemented. The roadmap item is "Workspace as ZIP" — would
combine Markdown serialization per page + CSV per database +
storage blobs into a single archive. Tracked in `BACKLOG.md §29.2`.

---

## Markdown per-page

### Export

`frontend/shared/lib/markdown.ts:blocksToMarkdown(blocks)`. Walks
the block tree:
- `h1/h2/h3` → `#`/`##`/`###`
- `bullet` → `- `
- `numbered` → `1. ` (numbering re-emitted, not preserved)
- `todo` → `- [ ]` / `- [x]`
- `quote` → `> `
- `code` → fenced ` ``` ` with `lang`
- `equation` → `$$ ... $$`
- `divider` → `---`
- `image` → `![caption](url)` then `**caption**` if present
- `embed` → `[caption](url)` (degrades to plain link in MD)
- `table` → pipe-separated table
- `toggle` → heading + indented body
- `columns2/3` → two/three blank-separated paragraphs (no native MD
  equivalent; lossy)
- `callout` / `page` / `database` / `button` → represented as plain
  paragraph with marker

Inline RT (`**bold**`, `_italic_`, `~~strike~~`, `` `code` ``,
`[label](url)`) is already in `block.text` as plain markers — round-
trips cleanly.

### Import

`convex/import/markdown.ts:parseMarkdownToBlocks(md)`. Inverse of the
exporter, with reasonable lossy behavior for the lossy block types.
Used by the ZIP importer when it sees a `.md` entry.

---

## Conventions

1. **Round-trip discipline** — JSON workspace export + import MUST
   round-trip lossless (modulo `isPublic`/`trashed`/`userId`). Any
   schema change requires updating BOTH sides in the same commit.
2. **Validate server-side** — never trust the JSON shape from the
   client. zod schemas live in `convex/import/workspace.ts`.
3. **ID remap** — phase 1+2 inserts capture maps; phase 3+4 patches
   apply them. Don't try to resolve in a single phase — it deadlocks
   on forward references.
4. **Caps everywhere** — file size, entry count, per-row content.
   Bulk imports are the easiest DoS vector; rate limit + cap is
   non-negotiable.
5. **Rate limit** the public mutations / actions:
   - `import.workspace` — 3/min
   - ZIP — uncapped today (relies on storage upload + size cap);
     consider 5/hour if abuse appears
6. **Versioning** — JSON export carries `version: 1`. When you add
   a breaking field, bump to `version: 2` and write a migration in
   `importFromJson`.
