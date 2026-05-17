# `notion` mega-slice — kitab lift-UP playbook

Status: **scaffolded**, **not yet lift-able**. Sub-slices still carry
generalization blockers (see `scripts/audit-kitab.mjs`).

## What this is

A single rr-kitab slice that bundles the full Nosion experience —
block editor, Notion-style databases, templates, workspace-io export/
import, sharing, comments, snapshots, AI agent — under one consumer
import:

```tsx
import {
  NotionAppProvider, NotionPage, NotionDatabase, NotionSidebar,
} from "@/slices/notion";

<NotionAppProvider config={{
  routes: { basePath: "/notes", page: (id) => `/notes/${id}` },
  features: { ai: false, sharing: false },
  i18n:    { untitledPage: "Halaman tanpa judul" },
}}>
  <NotionSidebar pages={pages} onSelect={openId => router.push(...)} />
  <NotionPage pageId={openId} />
</NotionAppProvider>
```

A consumer who calls `npx rahman-resources add notion` gets the slice
+ every sub-slice listed in `slice.manifest.json`.

## Files in this slice

| Path | Role |
|---|---|
| `index.ts` | Public-API barrel — re-exports config provider + wrappers |
| `NotionAppProvider.tsx` | React context for `NotionAppConfig` |
| `lib/config.ts` | Type + `DEFAULT_NOTION_CONFIG` + `mergeNotionConfig` |
| `.kitab.json` | Consumer manifest, sync direction, generalization status |
| `slice.manifest.json` | Sub-slice + shared + convex dep list |

The wrappers themselves (`NotionPage` / `NotionDatabase` / etc) live
under `frontend/shared/components/notion/` — already promoted to
shared since they're props-driven and dependency-free.

## Generalization blockers (current)

Run:

```bash
node scripts/audit-kitab.mjs           # summary table
node scripts/audit-kitab.mjs --write   # patch every .kitab.json
```

Latest scan: **76 blockers across 13 sub-slices.** Top offenders:

| Slice | Hits | Categories |
|---|---|---|
| workspace-sidebar | 27 | ROUTE_LITERAL ×22, ROLE_ENUM ×5 |
| workspace-members | 12 | ROLE_ENUM ×11, CONVEX_TABLE ×1 |
| editor | 9 | ROUTE_LITERAL ×5, CONVEX_TABLE ×2, ROLE_ENUM ×2 |
| dashboard | 8 | ROUTE_LITERAL ×8 |
| admin-panel | 5 | CONVEX_TABLE ×5 |
| databases | 4 | ROUTE_LITERAL ×2, CONVEX_TABLE ×1, ROLE_ENUM ×1 |
| wiki, backlinks, sharing, …    | 1–3 | mixed |

**22 slices already scan clean.** They likely still need the i18n /
content pass (auditor doesn't yet flag JSX text nodes) before they're
truly portable, but the structural blockers are gone.

## Blocker categories (auditor)

| ID | Pattern | Fix |
|---|---|---|
| `ROUTE_LITERAL` | `"/dashboard/..."` / `"/p/"` / `"/db/"` etc. | Read from `useNotionConfig().routes` (or import a named route from `@/shared/lib/routes`). |
| `ROLE_ENUM` | `"editor"` / `"viewer"` / `"super-admin"` literal | Replace with `config.roles.editor` etc. |
| `CONVEX_TABLE` | `Id<"pages">` / `Id<"databases">` in slice code | Push to a boundary cast at the data-access layer; slice code uses opaque string ids. |
| `ENV_LEAK` | `process.env.NEXT_PUBLIC_*` inside slice | Accept via prop. |

## Lift-UP workflow (when ready)

1. Run `node scripts/audit-kitab.mjs` — confirm zero blockers on every
   sub-slice listed in `notion/slice.manifest.json`.
2. Sweep each sub-slice's `.kitab.json` to `status: "portable"` +
   `syncDirection: "bidirectional"`.
3. Update `notion/.kitab.json` to `status: "portable"`.
4. From this repo:
   ```
   /rr-send notion
   ```
   The kitab CLI bundles the mega-slice + every sub-slice tagged
   `bidirectional` and uploads. The kitab side runs its own
   generalization gate; if a sub-slice still has a Nosion-specific bit,
   the push is rejected with a per-file diagnostic.

## Why a config provider instead of per-wrapper props

- Sub-slices each need a few project-specific values. Passing them as
  props to every wrapper would force consumers to thread the same
  config object through dozens of components.
- A context-based config keeps the public API small: one provider,
  zero ceremony at the call site.
- Defaults match Nosion exactly — Nosion itself does NOT need to
  mount the provider (`useNotionConfig()` falls through to
  `DEFAULT_NOTION_CONFIG`).
- Consumer overrides are partial — `mergeNotionConfig` deep-merges so
  you only state what differs.

## Backend story (incomplete)

The mega-slice ships the **frontend** only. The Convex backend
(`convex/`) is co-required but not packaged here for two reasons:

- Convex code isn't portable as a kitab slice — it's a deploy target,
  not a drop-in.
- Consumers may not use Convex at all; the slice's data interfaces
  (props on `NotionPage` / `NotionDatabase`) are storage-agnostic.

Future work: publish `@nosion/convex-backend` as a separate npm
package + a `convex-adapter` doc that maps `NotionPage` callbacks to
arbitrary backends (Convex, Supabase, Prisma+REST, in-memory).

## Roadmap

- [x] Auditor (`scripts/audit-kitab.mjs`) — emits structured blockers,
      writes them to every `.kitab.json`.
- [x] Mega-slice scaffold — `frontend/slices/notion/` with config +
      provider + barrel + manifests.
- [ ] Sweep ROUTE_LITERAL — replace 40+ hardcoded paths with
      `useNotionConfig().routes.*` calls.
- [ ] Sweep ROLE_ENUM — route through `config.roles.*` everywhere.
- [ ] Sweep CONVEX_TABLE — push table-typed ids out of slice code.
- [ ] i18n pass — extract JSX text nodes to `config.i18n.*`.
- [ ] Backend adapter contract — document how a non-Convex consumer
      wires the wrappers.
- [ ] First UP-push to kitab.

Track per-slice progress via the auditor:

```bash
node scripts/audit-kitab.mjs | grep -E "(✗|notion)"
```
