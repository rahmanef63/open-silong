# rr `notion-shell` BH / BI / BJ completion (2026-05-20)

Recap of the 3 waves landed in the
`rahmanef-resources-site` monorepo. All three lift portable subsets
from this nosion repo into the `notion-shell` rr slice (and wire the
matching template `notion-page-clone-os`). Source-of-truth stays
here; rr is the lifted distribution surface.

## Commits (in rr)

| Wave | SHA | notion-shell version | Headline |
|---|---|---|---|
| BH | `d430ed1` | v0.2.0 | SlashMenu + BlockActionsMenu + InsertBlockButton + inlineDecorator (caret + IME-safe) + NotionBlock hover ⋯ menu + toggle/callout renderers + reducer turn-into/duplicate |
| BI | `c0ad50e` | v0.3.0 | 6 views (Table / Board / List / Gallery / Calendar / Feed) + ViewTabs + ViewOptions (sort+filter+search) + ColumnHeaderMenu + 10 property cells + viewData helpers + reducer view CRUD |
| BJ | `5ee6437` | v0.4.0 | @dnd-kit SortableBlockList drag reorder + NotionPage cover prop + ImageRenderer + EmbedRenderer + PageActionsMenu + reducer reorder+duplicate |

## Source provenance (what each rr file lifts from)

### BH

| rr destination | nosion source | Strip notes |
|---|---|---|
| `frontend/slices/notion-shell/components/SlashMenu.tsx` | `frontend/slices/editor/SlashMenu.tsx` | drop linked-database entry; subset BLOCK_SPECS |
| `frontend/slices/notion-shell/components/BlockActionsMenu.tsx` | `frontend/slices/editor/blocks/BlockControls.tsx` + `BlockColorMenu.tsx` | simplified — no AskAI / no comments / no color (kept turn-into + duplicate + delete only) |
| `frontend/slices/notion-shell/components/InsertBlockButton.tsx` | NEW (rr-only) | wraps SlashMenu in popover; replaces fixed `+block` bar |
| `frontend/slices/notion-shell/lib/blockSpecs.ts` | `frontend/slices/editor/blockSpecs.ts` | subset to 18 block types (drop columns / synced / audio / video / button / toc / page-of-page) |
| `frontend/slices/notion-shell/lib/inlineMd.ts` | `frontend/shared/lib/inlineMd.tsx` | dropped katex import + React rendering (tokenizer + stripMd only) |
| `frontend/slices/notion-shell/lib/inline-decorator/{caret,decorate}.ts` | `frontend/slices/editor/lib/inline-decorator/{caret,decorate}.ts` | verbatim |
| `frontend/slices/notion-shell/lib/inlineDecorator.ts` | `frontend/slices/editor/lib/inlineDecorator.ts` | verbatim |
| `frontend/slices/notion-shell/components/NotionBlock.tsx` | `frontend/shared/components/notion/NotionBlock.tsx` (extended) | added decorator + hover actions menu + dragHandle slot (in BJ) |

### BI

| rr destination | nosion source | Strip notes |
|---|---|---|
| `frontend/slices/notion-shell/components/ViewTabs.tsx` | derived from `frontend/slices/databases/components/view-tabs` (subset) | 6 view types only (drop Chart / Form / Map / Timeline) |
| `frontend/slices/notion-shell/components/ViewOptions.tsx` | derived from `frontend/slices/databases/ViewOptions.tsx` | inline sort + filter + search (no group-by builder UI yet) |
| `frontend/slices/notion-shell/components/ColumnHeaderMenu.tsx` | derived from `frontend/slices/databases/components/column-header` | rename / change type / sort / hide / delete (no insert-column or freeze) |
| `frontend/slices/notion-shell/components/views/TableView.tsx` | `frontend/slices/databases/TableView.tsx` (stripped) | extracted from old `NotionDatabase` body |
| `frontend/slices/notion-shell/components/views/BoardView.tsx` | `frontend/slices/databases/BoardView.tsx` (stripped) | groupBy select/status only; no drag-to-reassign yet |
| `frontend/slices/notion-shell/components/views/ListView.tsx` | `frontend/slices/databases/ListView.tsx` (stripped) | compact |
| `frontend/slices/notion-shell/components/views/GalleryView.tsx` | `frontend/slices/databases/GalleryView.tsx` (stripped) | icon-stand-in cover (no real cover image — that needs BJ + rowOfDb cover propagation) |
| `frontend/slices/notion-shell/components/views/CalendarView.tsx` | `frontend/slices/databases/CalendarView.tsx` (stripped) | month grid only (no week/day) |
| `frontend/slices/notion-shell/components/views/FeedView.tsx` | `frontend/slices/databases/FeedView.tsx` (stripped) | chronological by updatedAt |
| `frontend/slices/notion-shell/components/property-cells.tsx` | `frontend/slices/databases/property-cells/` (consolidated into one switch) | 10 cell types in a single `renderPropertyCell()` helper (no relation / rollup / formula / files) |
| `frontend/slices/notion-shell/lib/viewData.ts` | derived from `frontend/slices/databases/lib/*` | pure applyView + groupBy + bucketByDate |

### BJ

| rr destination | nosion source | Strip notes |
|---|---|---|
| `frontend/slices/notion-shell/components/SortableBlockList.tsx` | derived from `frontend/slices/editor/PageEditor.tsx` DnD wiring | render-prop API; pointer + keyboard sensors only |
| `frontend/slices/notion-shell/components/PageActionsMenu.tsx` | derived from `frontend/slices/editor/PageActionsMenu.tsx` | dropdown w/ add-cover / favorite / duplicate / export / trash |
| `frontend/slices/notion-shell/components/blocks/ImageRenderer.tsx` | `frontend/slices/editor/blocks/ImageBlock.tsx` (stripped) | URL + caption only (no file upload, no resize handle, no align toolbar) |
| `frontend/slices/notion-shell/components/blocks/EmbedRenderer.tsx` | `frontend/slices/editor/blocks/EmbedBlock.tsx` (stripped) | provider auto-detect (YT/Vimeo/Loom/Figma/CodePen/Spotify) + iframe fallback |
| `frontend/slices/notion-shell/components/NotionPage.tsx` | (extended) | added `cover` prop + onCoverRemove |

## Parity vs nosion source

| Domain | nosion | rr notion-shell v0.4.0 | Notes |
|---|---|---|---|
| Slash menu | ✅ inline `/` trigger at caret | ⚠ button trigger only (no `/` key) | Inline trigger deferred — needs caret-anchored popover + key listener integration |
| Block actions | ✅ turn-into + color + duplicate + delete + comment + AskAI | ✅ turn-into + duplicate + delete | Color / comment / AskAI dropped (need slices) |
| Inline decorator | ✅ | ✅ verbatim | parity |
| Block types | 30+ (toggle, columns, synced, table-of-contents, button, audio, video, …) | 18 specs in slash menu, 7 renderers (equation, code, divider, toggle, callout, image, embed) | Specialised renderers deferred for columns/synced/audio/video/toc/button |
| Drag reorder | ✅ DnD-kit | ✅ DnD-kit (render-prop wrapper) | parity |
| Cover image | ✅ + file upload + unsplash + emoji + fit | ⚠ URL string only | Upload / unsplash / fit deferred |
| Page actions | ✅ duplicate / favorite / share / history / export / trash | ✅ duplicate / favorite / cover / export / trash | Share + history deferred (need slices) |
| Database views | 10+ (Table, Board, List, Gallery, Calendar, Feed, Timeline, Chart, Form, Map) | 6 (Table, Board, List, Gallery, Calendar, Feed) | Timeline / Chart / Form / Map deferred |
| Property types | 16+ (text, number, checkbox, select, multi_select, status, date, url, email, phone, person, files, relation, rollup, formula, created_time, …) | 10 (text, number, checkbox, select, multi_select, status, date, url, email, phone) | person / files / relation / rollup / formula deferred (need backend) |
| View options | sort + filter + group + search + visible-props + person-filter | sort + filter + search | group-by builder UI deferred; visible-props handled by ColumnHeaderMenu's "hide" |
| Sharing / wiki | ✅ slice | ❌ | not lifted — different distribution model |
| Comments / mentions | ✅ slices | ❌ | not lifted |
| Snapshots | ✅ | ❌ | not lifted |
| Trash / inbox / library | ✅ slices | ❌ | not lifted |
| AI agent | ✅ | ❌ | not lifted |
| Convex backend | ✅ | ❌ (localStorage only) | rr template ships `createTemplateStore` (localStorage + BroadcastChannel) instead |

## Template wiring (rr `notion-page-clone-os`)

The template at `components/templates/notion-page-clone/` consumes
notion-shell:

- `shared/store.tsx` — `createTemplateStore` with reducer routing
  doc.* → `notion-reducer.ts` (in-file) → db.* → `notion-db-reducer.ts`
- `shared/types.ts` — Action union with 18 doc.* + db.* + view.* variants
- `shared/seed.ts` — 3 demo docs + 1 Roadmap database w/ 3 default views
- `slices/notion-app/Dashboard.tsx` — sidebar + main orchestrator
- `slices/notion-app/DocView.tsx` — NotionPage + SortableBlockList + InsertBlockButton + PageActionsMenu + cover
- `slices/notion-app/DatabaseView.tsx` — NotionDatabase fully wired (5 onView* + 3 onProperty* + 3 onRow* callbacks)
- `slices/notion-app/block-renderers.tsx` — bridges notion-blocks (equation / code) + local (divider / toggle / callout) + notion-shell (image / embed)

Reducer split: `notion-reducer.ts` (doc.*) + `notion-db-reducer.ts` (db.*)
to stay under rr's 200-LOC audit cap.

## Operational notes

- 3 waves shipped via `git stash --keep-index` to isolate from rr's
  parallel agent BG-wave admin-panel scaffolding work.
- npm deps added in BJ: `@dnd-kit/core`, `@dnd-kit/sortable`,
  `@dnd-kit/utilities`.
- All commits pass rr's pre-push hook: audit:slices + audit:templates
  + audit:file-size + audit:convex-features + `npm run build`.
- Dokploy auto-build triggered on each push to main for both the rr
  preview site and (separately) nosion at `nosion.rahmanef.com`.

## Next sync trigger

When nosion gains a feature in `frontend/slices/editor/` or
`frontend/slices/databases/` that should propagate to the lifted
notion-shell, run `rr-sync/scan.mjs` (or whatever the current
sync-script entrypoint is) to identify drift, then patch rr by hand
following the same audit + commit pattern used in BH/BI/BJ.
