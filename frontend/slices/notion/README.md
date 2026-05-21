# `notion` mega-slice

Drop-in **block editor + database views + templates + workspace IO**
bundle for embedding the Notion-inspired open-silong UI inside any
React project. Backend-agnostic via the `NotionAdapter` contract.

Lift status: ✅ standalone-ready (Phase 4 of the mega-lift plan, see
[`docs/rr-sync/2026-05-21-notion-mega-lift-plan.md`](../../../docs/rr-sync/2026-05-21-notion-mega-lift-plan.md))

---

## Quick start (4 steps)

```bash
# 1. Install the slice (currently via the open-silong source repo;
#    npm publish pending). Copy `frontend/slices/notion/` +
#    `frontend/slices/editor/` + `frontend/slices/databases/` +
#    `frontend/slices/files/` + the shared deps the manifests
#    declare into your project. Use `scripts/sync-to-rr.mjs` for the
#    automated lift.
```

```tsx
// 2. Mount the umbrella once near your app root.
import {
  NotionAppProvider, useLocalStorageNotionAdapter,
} from "@/slices/notion";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const adapter = useLocalStorageNotionAdapter();
  return <NotionAppProvider adapter={adapter}>{children}</NotionAppProvider>;
}
```

```tsx
// 3. Render the surfaces you need (any subset).
import { NotionSidebar, NotionPage, NotionDatabase } from "@/slices/notion";

export default function Workspace() {
  return (
    <div className="grid grid-cols-[260px_1fr]">
      <NotionSidebar />
      <main>
        <NotionPage pageId={openPageId} />
        {/* OR <NotionDatabase dbId={openDbId} /> */}
      </main>
    </div>
  );
}
```

```tsx
// 4. (Optional) override defaults — config + adapter + components.
import { NotionAppProvider, useConvexNotionAdapter } from "@/slices/notion";

<NotionAppProvider
  adapter={useConvexNotionAdapter()}
  config={{ routes: { basePath: "/notes" } }}
  components={{ DatabaseBlock: MyCustomDatabaseRenderer }}
>
  …
</NotionAppProvider>
```

---

## Architecture

```
                 ┌────────────────────────────────┐
                 │   <NotionAppProvider />        │
                 │   (this slice — the umbrella)  │
                 │                                │
                 │   Mounts in one wrap:          │
                 │   ─ NotionAdapterProvider      │
                 │   ─ NotionAppConfig context    │
                 │   ─ EditorComponentsRegistry   │
                 │   ─ DatabasesComponentsRegistry│
                 └──┬─────────────────────────────┘
                    │
       ┌────────────┼────────────────────────┐
       ▼            ▼                        ▼
  editor slice  databases slice          your data
  (no peer dep) (no peer dep)            (NotionAdapter impl)
```

Sub-slices (`editor`, `databases`) are **peer-clean** — they don't
import each other directly. They consume peer components via the
componentsRegistry contexts the umbrella mounts. This breaks the
historical bidirectional cycle (rows-of-a-database are pages,
inline-database-blocks are editor blocks) at the architecture level.

---

## The `NotionAdapter` contract

Single TypeScript interface at
[`adapter/types.ts`](./adapter/types.ts) — required namespaces
(pages, databases, files) + 7 optional (ai, presence, search, user,
workspaces, recents, snapshots).

Reads = hooks (`useList`, `useOne`, `useUrl`). Writes = Promises
(`create`, `update`, `delete`).

Full consumer docs: [`docs/api/notion-adapter.md`](../../../docs/api/notion-adapter.md).

### Reference implementations bundled

| Hook | Backend | When to use |
|---|---|---|
| `useLocalStorageNotionAdapter()` | localStorage (~5–10 MB browser quota) | Demos, portfolios, templates, no-backend onboarding |
| `useConvexNotionAdapter()` | Self-hosted Convex | Production. Imported directly from `@/slices/notion/adapter/convexAdapter` (skip-listed at rr lift time so it never lands in rr) |

### Roll your own

Implement the `NotionAdapter` interface against your own backend
(REST, GraphQL, S3, custom). Pattern:

```tsx
import type { NotionAdapter } from "@/slices/notion";

export function useMyCustomAdapter(): NotionAdapter {
  return {
    pages: { /* 14 methods */ },
    databases: { /* 22 methods */ },
    files: useMyFilesAdapter(),
    // Optional namespaces — provide only what your backend supports.
  };
}
```

Then mount: `<NotionAppProvider adapter={useMyCustomAdapter()} />`.

---

## Component overrides

Pass per-slot overrides via the `components` prop:

```tsx
<NotionAppProvider
  adapter={adapter}
  components={{
    DatabaseBlock: MyDatabaseRenderer,    // replaces the bundled DatabaseBlock
    PropertyCell: MyPropertyCell,         // replaces the bundled PropertyCell
    BlockEditor: MyBlockEditor,           // replaces the bundled BlockEditor
    RowPropertiesPanel: MyRowProps,       // replaces the bundled RowPropertiesPanel
  }}
>
```

Defaults bundle the components from `@/slices/editor` and
`@/slices/databases`. Pass `undefined` (or omit) to keep the default.

---

## File map

```
frontend/slices/notion/
├── NotionAppProvider.tsx         # the umbrella — mount this
├── index.ts                      # barrel — public API
├── README.md                     # this file
├── slice.manifest.json           # dep declaration for the lift script
├── lib/
│   ├── config.ts                 # NotionAppConfig + defaults
│   └── useNotionConfig.ts        # config hook
└── adapter/
    ├── types.ts                  # NotionAdapter interface (the contract)
    ├── context.tsx               # NotionAdapterProvider + useNotionAdapter
    ├── noopAdapter.ts            # throws-on-call shim for tests / fallback
    ├── localStorageAdapter/      # rr-side default (skeleton + Phase 4+ impl)
    │   └── index.ts
    └── convexAdapter/            # production impl (SKIP-LISTED at lift time)
        ├── pages.ts
        ├── databases.ts
        ├── optional.ts
        └── index.tsx
```

---

## Versioning

Currently `v0.2.0-alpha` — interface frozen pending consumer
feedback. First stable release tagged after the rr-side standalone
demo ships (Phase 5 of the mega-lift plan).

Contract changes follow semver:
- **patch** — bug fixes in shipped adapters (Convex / localStorage)
- **minor** — additive method on an optional namespace
- **major** — required namespace shape change or removal

---

## Related docs

- [Consumer adapter contract docs](../../../docs/api/notion-adapter.md)
- [Mega-slice lift plan (6 phases)](../../../docs/rr-sync/2026-05-21-notion-mega-lift-plan.md)
- [Site map of every coupling site](../../../docs/rr-sync/2026-05-21-adapter-site-map.md)
- [Files adapter precedent](../files/adapter/)
- [open-silong root README](../../../README.md)
