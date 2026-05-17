# Slice inventory — notion-page-clone

37 vertical slices under `frontend/slices/<slug>/` + Notion wrappers
under `frontend/shared/components/notion/`. This project is the
source-of-truth for Nosion's block editor, Notion-style databases,
and the `notion` mega-slice bundle (see `docs/notion-mega-slice.md`).

## Project layout

```
notion-page-clone/
├── components/ui/                ← shadcn primitives
├── lib/utils.ts                  ← shadcn util
├── frontend/slices/              ← 37 slices
│   ├── notion/                   ← mega-slice — barrel + NotionAppProvider
│   ├── editor/                   ← block editor + slash menu (FLAGSHIP)
│   ├── databases/                ← 11 view types (FLAGSHIP)
│   ├── workspace-sidebar/        ← page tree dnd
│   ├── command-palette/          ← Cmd+K palette
│   ├── comments/                 ← inline + side-panel comments
│   ├── cover/                    ← Notion-style cover image picker
│   ├── block-selection/  backlinks/  mentions/  snapshots/  templates/
│   ├── code-block/  equation/  trash/  wiki/  theme-presets/
│   ├── admin-panel/  ai-agent/  analytics/  dashboard/
│   ├── database-cell-selection/  database-csv/  database-json/
│   ├── database-presets/  database-templates/
│   ├── feedback/  files/  inbox/  library/  mobile-nav/  notifications/
│   ├── search/  sharing/  simple-table/  workspace-io/  workspace-members/
│   └── …
├── frontend/shared/components/notion/    ← portable Notion wrappers
└── convex/                                ← self-hosted Convex backend
```

## Bundle for re-use

Use the `notion` mega-slice when embedding the Notion experience in
another React project:

```tsx
import { NotionAppProvider, NotionPage } from "@/slices/notion";

<NotionAppProvider config={{ routes: { basePath: "/notes" } }}>
  <NotionPage pageId={openId} />
</NotionAppProvider>
```

See `docs/notion-mega-slice.md` for the full API contract,
generalisation blockers, and roadmap.

## Slice portability auditor

```bash
node scripts/audit-portability.mjs           # summary
node scripts/audit-portability.mjs --json    # per-slice JSON
```

Scans every slice for hardcoded routes, role enums, Convex table-name
leaks, and env-var reads. Output drives the generalisation roadmap in
`docs/notion-mega-slice.md`.

## Hard rules

1. **No Clerk** — auth via `@convex-dev/auth`
2. **shadcn-only UI** — no raw `<button>` / `<input type=date>` etc
3. **Push direct to `main`** — solo dev, conventional commits, Dokploy
   webhook auto-builds
4. **Convex queries gate on `requireWorkspaceMember`** — never trust
   route-level auth
5. **Slice barrel imports only** — no `@/slices/foo/internal/thing`
