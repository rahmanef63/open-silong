# `notion` mega-slice — portable bundle

Drop-in bundle that ships the full open-silong experience (block
editor + Notion-style databases + templates + workspace-io +
sharing + comments + snapshots + AI agent) under one consumer
import. Use it inside another React project to embed the whole
Notion-inspired surface without dragging 27 individual slices
manually.

**Updated 2026-05-21 (Phase 4 of the mega-lift plan)** — the
provider is now the umbrella for config + `NotionAdapter` + the two
componentsRegistry contexts. Sub-slices (editor / databases) no
longer import each other directly; the cycle is hoisted to this
umbrella. See [`docs/rr-sync/2026-05-21-notion-mega-lift-plan.md`](./rr-sync/2026-05-21-notion-mega-lift-plan.md)
for the full architecture rationale, and
[`frontend/slices/notion/README.md`](../frontend/slices/notion/README.md)
for the in-slice quick-start.

## Consumer pattern (Phase 4+)

```tsx
import {
  NotionAppProvider, useLocalStorageNotionAdapter,
  NotionPage, NotionDatabase, NotionSidebar,
} from "@/slices/notion";

function Demo() {
  const adapter = useLocalStorageNotionAdapter();
  return (
    <NotionAppProvider
      adapter={adapter}
      config={{
        routes: { basePath: "/notes", page: (id) => `/notes/${id}` },
        features: { ai: false, sharing: false },
        i18n:    { untitledPage: "Halaman tanpa judul" },
      }}
    >
      <NotionSidebar pages={pages} onSelect={openId => router.push(...)} />
      <NotionPage pageId={openId} />
    </NotionAppProvider>
  );
}
```

`adapter` is **required** (post-Phase 4). Pick one of the bundled
reference impls or write your own implementing the `NotionAdapter`
contract from [`adapter/types.ts`](../frontend/slices/notion/adapter/types.ts).
`config` and `components` remain optional.

## Files in this slice

| Path | Role |
|---|---|
| `index.ts` | Public-API barrel — re-exports umbrella + wrappers + adapter symbols |
| `NotionAppProvider.tsx` | Umbrella — mounts adapter + config + 2 componentsRegistry contexts |
| `lib/config.ts` | Type + `DEFAULT_NOTION_CONFIG` + `mergeNotionConfig` |
| `lib/useNotionConfig.ts` | Hook over the config context |
| `slice.manifest.json` | Sub-slice + shared + convex dep list |
| `README.md` | In-slice quick-start (consumer-facing) |
| `adapter/types.ts` | `NotionAdapter` contract — backend-agnostic data layer |
| `adapter/context.tsx` | `NotionAdapterProvider` + `useNotionAdapter` |
| `adapter/noopAdapter.ts` | Throws-on-call shim for tests / fallback |
| `adapter/convexAdapter/` | Production impl (skip-listed at rr-lift time) |
| `adapter/localStorageAdapter/` | rr / demo default (skeleton today, full impl Phase 4+) |

The wrappers themselves (`NotionPage` / `NotionDatabase` / `NotionHeader`
/ `NotionSidebar` / `NotionBlock` / `NotionProperty`) live under
`frontend/shared/components/notion/` — already promoted to shared
since they're props-driven and dependency-free.

## Portability auditor

Generalisation blockers (hardcoded routes, role enums, table-name
leaks, env reads) are tracked by an automated scanner:

```bash
node scripts/audit-portability.mjs          # summary table
node scripts/audit-portability.mjs --json   # per-slice JSON
```

Latest scan: **~90 blockers across 13 sub-slices.** Top offenders:

| Slice | Hits | Categories |
|---|---|---|
| workspace-sidebar | 27 | ROUTE_LITERAL ×22, ROLE_ENUM ×5 |
| workspace-members | 12 | ROLE_ENUM ×11, CONVEX_TABLE ×1 |
| editor | 9 | ROUTE_LITERAL ×5, CONVEX_TABLE ×2, ROLE_ENUM ×2 |
| dashboard | 8 | ROUTE_LITERAL ×8 |
| admin-panel | 5 | CONVEX_TABLE ×5 |
| databases | 4 | ROUTE_LITERAL ×2, CONVEX_TABLE ×1, ROLE_ENUM ×1 |
| wiki, backlinks, sharing, …    | 1–3 | mixed |

**22 slices already scan clean.** They still need a content-pass for
i18n strings (the auditor doesn't flag JSX text nodes yet) before
they're fully consumer-agnostic, but their structural blockers are
gone.

## Blocker categories

| ID | Pattern | Fix |
|---|---|---|
| `ROUTE_LITERAL` | `"/dashboard/..."` / `"/p/"` / `"/db/"` etc. | Read from `useNotionConfig().routes` (or import a named route from `@/shared/lib/routes`). |
| `ROLE_ENUM` | `"editor"` / `"viewer"` / `"super-admin"` literal | Replace with `config.roles.*`. |
| `CONVEX_TABLE` | `Id<"pages">` / `Id<"databases">` in slice code | Push to a boundary cast at the data-access layer; slice code uses opaque string ids. |
| `ENV_LEAK` | `process.env.NEXT_PUBLIC_*` inside slice | Accept via prop. |

## Why a config provider instead of per-wrapper props

- Sub-slices each need a few project-specific values. Passing them as
  props to every wrapper would force consumers to thread the same
  config object through dozens of components.
- A context-based config keeps the public API small: one provider,
  zero ceremony at the call site.
- Defaults match Nosion exactly — Nosion itself does NOT need to
  mount the provider.
- Consumer overrides are partial — `mergeNotionConfig` deep-merges so
  you only state what differs.

## Backend story (still incomplete)

The mega-slice ships the **frontend** only. The Convex backend
(`convex/`) is co-required but not packaged here for two reasons:

- Convex code isn't a drop-in — it's a deploy target.
- Consumers may not use Convex; the slice's data interfaces (props on
  `NotionPage` / `NotionDatabase`) are storage-agnostic.

Future work: publish `@nosion/convex-backend` as a separate npm
package + a `convex-adapter` doc that maps `NotionPage` callbacks to
arbitrary backends (Convex, Supabase, Prisma+REST, in-memory).

## Roadmap

- [x] Portability auditor (`scripts/audit-portability.mjs`)
- [x] Mega-slice scaffold + config provider
- [ ] Sweep ROUTE_LITERAL — replace 40+ hardcoded paths with
      `useNotionConfig().routes.*` calls
- [ ] Sweep ROLE_ENUM — wire `config.roles.*` through
      workspace-members + sidebar
- [ ] Sweep CONVEX_TABLE — push `Id<"pages">` casts to data-access
      boundary
- [ ] i18n pass — extract JSX text → `config.i18n.*`
- [ ] Backend adapter contract — how non-Convex consumers wire wrappers

Track per-slice progress via the auditor:

```bash
node scripts/audit-portability.mjs | grep -E "✗"
```
