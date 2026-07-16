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
    <NotionAppProvider adapter={adapter}>
      <NotionSidebar pages={pages} onSelect={openId => router.push(...)} />
      <NotionPage pageId={openId} />
    </NotionAppProvider>
  );
}
```

`adapter` is **required** (post-Phase 4). Pick one of the bundled
reference impls or write your own implementing the `NotionAdapter`
contract from [`adapter/types.ts`](../frontend/slices/notion/adapter/types.ts).
`components` (per-slot overrides) remains optional.

## Files in this slice

| Path | Role |
|---|---|
| `index.ts` | Public-API barrel — re-exports umbrella + wrappers + adapter symbols |
| `NotionAppProvider.tsx` | Umbrella — mounts adapter + 2 componentsRegistry contexts |
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

## Backend story (still incomplete)

The mega-slice ships the **frontend** only. The Convex backend
(`convex/`) is co-required but not packaged here for two reasons:

- Convex code isn't a drop-in — it's a deploy target.
- Consumers may not use Convex; the slice's data interfaces (props on
  `NotionPage` / `NotionDatabase`) are storage-agnostic.

Future work: publish `@nosion/convex-backend` as a separate npm
package + a `convex-adapter` doc that maps `NotionPage` callbacks to
arbitrary backends (Convex, Supabase, Prisma+REST, in-memory).
