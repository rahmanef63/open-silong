# Modularity / DRY / docs-freshness audit — 2026-05-09

Holistic review of `frontend/slices/`, `convex/`, and `docs/` to
answer two questions:

1. Are the docs current with the recent feature burst (cycles 5–9)?
2. Can each slice be lifted into another Next.js + Convex project (or
   non-Convex with adapter swap)?

Three parallel passes ran: docs freshness, slice coupling, DRY scan.

## 1. Docs freshness

| File | Status | Action taken in this audit |
|---|---|---|
| `CLAUDE.md` | STALE: Slack-model only, 4-phase remap, no admin/library routes | Updated: WYSIWYG note, 5-phase remap, route list, feature surfaces section |
| `docs/api/blocks.md` | STALE: silent on WYSIWYG decorator | Added decorator section pointing to `inline-decorator.md` |
| `docs/api/import-export.md` | Already 5-phase ✓ | None |
| `docs/api/admin.md` | MISSING | Created |
| `docs/api/library.md` | MISSING | Created |
| `docs/api/block-controls.md` | MISSING | Created |
| `docs/api/inline-decorator.md` | MISSING | Created |
| `docs/api/auth.md` | FRESH ✓ | None |
| `docs/api/templates.md` | FRESH ✓ | None |
| `docs/api/mcp.md` | FRESH ✓ | None |
| `docs/api/notion-shape.md` | FRESH ✓ | None |
| `docs/FEATURES.md` | STALE (~5 cycles behind) | Deferred — superseded by per-feature API docs |
| Root `README.md` | EMPTY | Deferred — low priority |

Still missing (Tier 2): per-property config, column header menu (13
items), 6px block padding standardization. None of these are
load-bearing UX — they are visual polish documented adequately in
their commit messages.

## 2. Slice modularity

38 slices total under `frontend/slices/`. Tier 1 result: **all 38
have `index.ts`** (was 32; added 6 in this audit: dashboard,
databases, editor, sharing, snapshots, trash).

### Coupling tiers

| Tier | Count | Definition |
|---|---|---|
| STANDALONE | 5 | Zero slice deps, only `@/shared/ui` + `@/shared/lib` utils. Lift directly. |
| SHARED-PRIMITIVES-ONLY | 6 | Adds `useStore()` dep but no other slice. Lift requires store interface. |
| COUPLED | 9 | Imports 1–2 sibling slices. Lift requires bringing the dependents. |
| TIGHTLY-COUPLED | 5 | Imports 3+ sibling slices. Lift impractical without bundle. |
| CONVEX-COUPLED | 9 | Calls `convex/react` hooks directly, bypassing `useStore()`. Lift requires backend swap. |
| CORE-DEPENDENCY | 4 | `editor`, `databases`, `workspace-sidebar`, `dashboard` — depend on many slices and many slices depend on them. |

### Lift-friendly slices today

Drop into another project with minimal effort:

- `code-block` — Monaco-style code block with hljs, no slice deps
- `equation` — KaTeX block, no slice deps
- `icon-picker` — Lucide + emoji picker, no slice deps
- `notifications` — bell badge component, no slice deps
- `database-cell-selection` — drag-fill helpers, pure logic

### Top lift-blockers

1. **`editor` imports 15 slices** — analytics, backlinks, block-selection,
   code-block, comments, databases, equation, icon-picker, mentions,
   notifications, sharing, simple-table, snapshots, wiki, workspace-io.
   Cannot lift the editor without bringing the whole feature graph.
2. **`databases` imports 6 slices** — database-row, database-json,
   database-csv, database-cell-selection, database-row-selection,
   database-templates. The "databases macro-feature" is really a
   bundle of 7 slices coupled by component imports.
3. **8 slices bypass `useStore()`** — admin-panel, ai-agent, comments,
   editor, inbox, wiki, workspace-io, search. They call
   `useQuery(api.x.y)` / `useMutation(api.x.z)` directly. This makes
   them Convex-locked: no adapter seam to swap a different backend.
4. **Circular dep risk** — `block-selection` ↔ `editor`. Currently
   one-way (editor consumes block-selection's hook), but the slice
   exposes a context that the editor mounts.
5. **`workspace-sidebar` imports 8 slices** — admin-panel, ai-agent,
   feedback, icon-picker, inbox, templates, workspace-io, plus
   self-references. The sidebar is the convergence point of every
   non-content feature.

## 3. DRY violations

### Resolved in this audit

- `relTime` defined in 6 places (`shared/lib/format` canonical, plus
  inbox/lib/format, BlockControls, Dashboard, CommentItem, UsersPanel,
  SectionTable). All 5 duplicates now import the canonical
  `formatRelTime`. inbox/lib/format re-exports under the old name to
  preserve internal call sites.

### Remaining (Tier 2)

- **Inline `toLocaleDateString` × 16+ sites**. Should funnel through
  `formatDate()` / `formatDateShort()` / `formatDateLong()` helpers
  added to `shared/lib/format.ts`.
- **Dialog state boilerplate** in `ShareDialog`, `CsvImportDialog`,
  `JsonImportDialog`, `WorkspaceIODialog`, AI flows. Each redefines
  `[error, setError, importing, imported]` + `reset()`. Worth a
  `useDialogState()` hook.
- **No `<TabbedDialog>` wrapper** — `WorkspaceIODialog` and
  `TemplatesDialog` both wire `Dialog + Tabs + TabsList + TabsTrigger`
  manually.
- **Async error+toast pattern × 20+ sites** — `try { … } catch (e) {
  reportError(...); toast.error(...) }`. A `useAsyncError()` hook would
  collapse this.

### Healthy

- `requireOwned` is the canonical Convex auth helper. Audit found
  zero remaining sites doing the manual `getAuthUserId + db.get +
  userId-compare` triplet — all converted in earlier cycles.

## 4. Roadmap to portability (Tier 3, deferred)

To make any feature liftable into another project requires:

1. **Adapter interfaces per slice.** Each slice defines what data it
   needs as a TypeScript interface (`PageAdapter`, `BlockAdapter`,
   `CommentAdapter`). Default implementation wires to Convex via
   `useStore()`; alternate implementations could wire to REST,
   GraphQL, IndexedDB, etc.
2. **Headless + wired split.** Mirror the Radix pattern: pure logic
   hooks (`useLibraryData(adapter)`) + presentation components
   (`<LibraryView />`). Routes wire them together.
3. **Slice-local schema declarations.** Each slice exports its
   required `Block` shape so a consumer can know what to pass in
   without pulling the entire `@/shared/types/domain.ts`.
4. **Per-slice package boundaries.** Eventually split slices into
   workspace packages (`@nosion/library`, `@nosion/editor`) so
   external projects can install one feature without the rest.

Cost: ~20–40 hours of focused refactor, depending on how many slices
get adapter-ised. Out of scope for this audit cycle.

## Tier 1 changes shipped in this commit

- `CLAUDE.md` synced (WYSIWYG, 5-phase, routes, feature index)
- `docs/api/blocks.md` updated (WYSIWYG decorator section)
- `docs/api/admin.md`, `library.md`, `block-controls.md`,
  `inline-decorator.md` created (≈800 lines new docs)
- `docs/audit/2026-05-09-modularity-audit.md` (this file)
- 6 missing `index.ts` barrels added (dashboard, databases, editor,
  sharing, snapshots, trash)
- `relTime` deduped across 5 sites → `formatRelTime` from
  `shared/lib/format`
