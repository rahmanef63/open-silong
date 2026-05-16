# Rahman Resources (rr) — slice usage di notion-page-clone

> Project ini = **biggest harvest opportunity**. 35 slices, baru 2 yang sudah di-lift ke rr (command-menu, comments).
> Full distribution guide: https://github.com/rahmanef63/resource-site/blob/main/docs/distribution.md

## Struktur project

```
notion-page-clone/
├── components/ui/                ← shadcn primitives
├── lib/utils.ts                  ← shadcn util
├── frontend/slices/              ← 35 slice
│   ├── editor/                   ← block editor + slash menu (FLAGSHIP)
│   ├── databases/                ← 11 view types (FLAGSHIP)
│   ├── workspace-sidebar/        ← page tree dnd
│   ├── command-palette/          ← sudah lift → rr `command-menu`
│   ├── comments/                 ← sudah lift → rr `comments`
│   ├── block-selection/  backlinks/  mentions/  snapshots/  templates/
│   ├── code-block/  equation/  trash/  wiki/  theme-presets/
│   ├── admin-panel/  ai-agent/  analytics/  dashboard/
│   ├── database-cell-selection/  database-csv/  database-json/
│   ├── database-presets/  database-templates/
│   ├── feedback/  files/  inbox/  library/  mobile-nav/  notifications/
│   ├── search/  sharing/  simple-table/  workspace-io/  workspace-members/
│   └── ...
└── convex/features/
```

## Slice dari rr (terinstall via `npx rr add`)

Belum ada — notion-clone ini source-of-truth untuk slice editor/databases.

## Slice yang BELUM di-lift (harvest priority HIGH)

Per audit 2026-05-16, slice notion paling worth-lifting:

**Flagship (must-harvest):**
- `editor` — block editor + slash menu, **the** Notion-clone feature
- `databases` — 11 view types (table/board/calendar/timeline/gallery/list/etc)
- `workspace-sidebar` — page tree dnd
- `theme-presets` — OKLch theme switcher

**High value:**
- `backlinks`, `snapshots`, `templates`, `mentions`, `block-selection`

**Medium value:**
- `code-block`, `equation`, `trash`, `wiki`

## Workflow umum

### Install slice baru dari rr

```bash
cd ~/projects/notion-page-clone
npx rr add seo                # contoh
```

### Lift slice notion → rr

Notion ini source-of-truth untuk slice editor/databases. Per harvest:

```bash
# 1. pastikan slice generalized (no hardcode "notion-clone" specifik)
# 2. copy
cp -r frontend/slices/editor/ ~/projects/resources/frontend/slices/editor/

# 3. di rr — edit, bikin slice.json + manifest, commit + push
cd ~/projects/resources
# detail: docs/distribution.md
```

Atau pakai `/rr lift <slug>` skill (terpandu).

## Hal yang TIDAK perlu dilakukan

- ❌ `.kitab.json` per slice — udah dihapus 2026-05-16 (3 file dihapus dari notion)
- ❌ `bidir` block di slice.contract.ts — vestigial
- ❌ `npx rr scan-consumers` — removed v1.0.0

## Hard rules

1. **No Clerk** — `@convex-dev/auth`
2. **shadcn-only UI**
3. **Push direct main**
