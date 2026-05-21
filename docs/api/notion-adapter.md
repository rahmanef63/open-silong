# `NotionAdapter` — consumer contract

The mega-slice `frontend/slices/notion/` is **backend-agnostic**.
Everything it reads or writes flows through the `NotionAdapter`
interface defined at
[`frontend/slices/notion/adapter/types.ts`](../../frontend/slices/notion/adapter/types.ts).

This doc is for **consumers** — anyone integrating the mega-slice
into their own React project (open-silong itself, rr's demo, your
own app). For the **integrator** view (how to refactor the slice
internals to USE this contract), see the lift plan at
[`docs/rr-sync/2026-05-21-notion-mega-lift-plan.md`](../rr-sync/2026-05-21-notion-mega-lift-plan.md).

---

## TL;DR

```tsx
import {
  NotionAppProvider,
  useLocalStorageNotionAdapter,
  NotionSidebar,
  NotionPage,
} from "@/slices/notion";

export default function App() {
  // No backend → use localStorage default
  const adapter = useLocalStorageNotionAdapter();
  return (
    <NotionAppProvider adapter={adapter}>
      <div className="grid grid-cols-[260px_1fr]">
        <NotionSidebar />
        <NotionPage pageId={someId} />
      </div>
    </NotionAppProvider>
  );
}
```

Three lines: import provider, mount with an adapter, render the
wrappers. That's the entire integration. Everything else (block
editing, database views, slash menu, drag-handle, comments, cover
image, etc.) is wired internally.

---

## Architecture

```
       ┌─────────────────────────────────────────────────────┐
       │  Consumer app (open-silong / rr-demo / your project) │
       └─────────────────────────────────────────────────────┘
                                │
                                │ <NotionAppProvider adapter={...}>
                                ▼
       ┌─────────────────────────────────────────────────────┐
       │  Notion mega-slice — editor + databases + templates  │
       │  + workspace-io + comments + sharing + wiki …        │
       │                                                      │
       │  Every read/write goes through useNotionAdapter()    │
       └─────────────────────────────────────────────────────┘
                                │
                                │ adapter.pages.update(...)
                                │ adapter.databases.setRowValue(...)
                                │ adapter.files.upload(...)
                                ▼
       ┌─────────────────────────────────────────────────────┐
       │  Your adapter implementation                         │
       │  ─ useConvexNotionAdapter()    (production)          │
       │  ─ useLocalStorageNotionAdapter() (demo / portfolio) │
       │  ─ useS3NotionAdapter()        (hypothetical custom) │
       └─────────────────────────────────────────────────────┘
```

The mega-slice has **zero direct Convex / S3 / store coupling**.
Everything is contract-driven.

---

## The adapter contract

Single TypeScript interface with 3 required + 7 optional
sub-namespaces:

| Namespace | Required? | What it covers |
|---|:-:|---|
| `pages` | ✅ | Page CRUD + block CRUD (add/update/delete/duplicate/reorder/replace) |
| `databases` | ✅ | Database schema CRUD + properties + select options + views + rows + setRowValue + relations |
| `files` | ✅ | Reuses `FilesAdapter` from `@/slices/files`. Upload, remove, useUrl. |
| `ai` | optional | LLM completion (used by Ask-AI, inline-AI, selection toolbar). Omit → AI buttons hide. |
| `presence` | optional | Per-page recent-viewers + touch. Omit → SeenByBadge hides. |
| `search` | optional | Full-text page + database search. Omit → search returns []. |
| `user` | optional | Identity (current + byId). Omit → comments author as "Anonymous". |
| `workspaces` | optional | Multi-tenant scope. Omit → single hard-coded workspace. |
| `recents` | optional | "Last opened" tracker. Omit → recents UI hides. |
| `snapshots` | optional | Version history per page. Omit → version drawer hides. |

Full TypeScript shape: see `types.ts` (the file is the contract).

---

## Required vs optional in practice

### Required (every consumer ships these)

You MUST provide `pages`, `databases`, `files`. The editor + databases
slices cannot function without these.

```ts
const myAdapter: NotionAdapter = {
  pages: {
    useList: (args) => { /* hook returning Page[] */ },
    useOne: (id) => { /* hook returning Page | null */ },
    useChildren: (parentId) => { /* hook */ },
    create: async (input) => { /* return new id */ },
    update: async ({ pageId, patch }) => { /* … */ },
    trash: async (id) => { /* … */ },
    // … 8 more methods
  },
  databases: {
    // 22 methods total
  },
  files: useMyFilesAdapter(),  // reuse FilesAdapter shape
  // optional namespaces below…
};
```

### Optional (capabilities-driven UI)

Omit any optional namespace and the UI surfaces that depend on it
self-detect and degrade gracefully:

```ts
const minimalAdapter: NotionAdapter = {
  pages,
  databases,
  files,
  // ai omitted → Ask-AI button hides
  // presence omitted → SeenByBadge hides
  // search omitted → search returns []
};
```

The slice never throws on a missing optional — it always uses the
`adapter.ai?.complete?.()` pattern internally.

---

## Hook-based reads, promise-based writes

Reads use hooks so each adapter implementation can pick its own
reactive primitive:

| Adapter | Reactive primitive | Why |
|---|---|---|
| Convex | `useQuery()` | live realtime subscriptions, optimistic patching |
| localStorage | `useSyncExternalStore` over a custom event channel | cross-tab via `storage` event |
| React Query | `useQuery()` from TanStack Query | stale-while-revalidate, caching |
| GraphQL | `useSubscription()` | WebSocket push |

Writes use promises so the adapter can layer its own optimism
strategy. The contract doesn't enforce one. Examples:

- **Convex**: `useMutation(...).withOptimisticUpdate(...)` patches
  the local query store before the server roundtrip
- **localStorage**: write immediately, no roundtrip — write IS the
  source of truth
- **React Query**: `useMutation()` with `onMutate` optimistic patch

---

## Reference implementations

Two ship in the slice:

### 1. `useConvexNotionAdapter()` — production

Backed by self-hosted Convex (the open-silong reference backend).
Skip-listed in `rr-sync.json.skipFiles` so the rr-side lift never
inherits a Convex import. Lives at
`frontend/slices/notion/adapter/convexAdapter.tsx`.

Use this when:
- Your app already runs Convex (cloud or self-hosted)
- You want realtime updates without writing your own pub/sub
- You're deploying open-silong as-shipped

### 2. `useLocalStorageNotionAdapter()` — demo

Stores everything in `localStorage` under namespaced keys. No
backend, no auth, single hard-coded workspace. Lives at
`frontend/slices/notion/adapter/localStorageAdapter.ts`.

Use this when:
- You're shipping a portfolio / template / demo deploy
- You want zero-backend onboarding for first-time users
- You're prototyping consumer integration

Quota: 5-10 MB per origin (browser-dependent). Cleared by `localStorage.clear()`.

### Roll your own

Implement the `NotionAdapter` interface against any backend:

```tsx
import type { NotionAdapter } from "@/slices/notion";

export function useMyCustomAdapter(): NotionAdapter {
  return {
    pages: {
      useList: ({ workspaceId }) => useMyQuery(["pages", workspaceId]),
      useOne: (id) => useMyQuery(["page", id]),
      // … fill in all required methods
    },
    databases: { /* … */ },
    files: useMyFilesAdapter(),
    // Optional namespaces — provide only the ones your backend supports
  };
}
```

Recommended pattern: extract per-namespace helpers (one hook per
sub-namespace) and compose them into the final adapter. Mirrors how
the Convex + localStorage adapters are structured.

---

## Provider mount

```tsx
import { NotionAppProvider } from "@/slices/notion";

<NotionAppProvider
  adapter={adapter}
  config={{
    // Optional — override routes / labels / role enums for embedding
    // inside a host app's URL space
    routes: { basePath: "/notes" },
    labels: { signIn: "Continue" },
  }}
  components={{
    // Optional — override the bundled sub-components (e.g. swap
    // DatabaseBlock for a custom inline-DB renderer)
    DatabaseBlock: MyCustomDatabaseBlock,
    PageEditor: MyCustomPageEditor,
  }}
>
  {children}
</NotionAppProvider>
```

All three props are optional except `adapter`. `config` defaults to
open-silong's own routes; `components` defaults to the bundled
implementations.

Inside the slice, sub-components consume via:

```ts
import { useNotionAdapter } from "@/slices/notion";

function MyBlockComponent() {
  const adapter = useNotionAdapter();
  const page = adapter.pages.useOne(pageId);
  // …
}
```

The hook throws if called outside `<NotionAppProvider>`, matching
React Context convention.

---

## Error handling

Writes throw `Error` with a user-safe message. Consumers wrap in
`try/catch` or use the bundled `sanitizeError` helper from
`@/shared/lib/error`:

```ts
import { sanitizeError } from "@/shared/lib/error";
import { toast } from "sonner";

try {
  await adapter.pages.update({ pageId, patch });
} catch (err) {
  toast.error(sanitizeError(err));
}
```

Reads return `undefined` while loading, `null` for "not found", or
the value when loaded. Never throw from hooks (per React rules).

---

## Optional capability detection

To gracefully degrade UI based on what the adapter provides:

```tsx
const adapter = useNotionAdapter();

return (
  <>
    {adapter.ai?.complete && (
      <AskAIButton onClick={() => adapter.ai!.complete({ messages: [...] })} />
    )}
    {adapter.presence?.useRecentViewers && (
      <SeenByBadge pageId={pageId} />
    )}
  </>
);
```

The slice's bundled components already do this internally — you
don't have to gate consumer-facing components manually unless you're
writing custom ones.

---

## Ids are strings

Per the boundary-cast pattern in `CLAUDE.md`:

```ts
// ✅ Adapter contract uses string everywhere
adapter.pages.update({ pageId: "abc123", patch: {...} });

// ✅ Adapter implementation casts internally where it needs branded ids
async update({ pageId, patch }) {
  await mutation({ pageId: pageId as Id<"pages">, patch });
}
```

Consumers never see `Id<T>`. The contract is portable across
backend choices (Convex, UUIDs, snowflake, …).

---

## Versioning

The adapter contract follows semver:

- **Patch** — bug fixes in shipped reference adapters (Convex, localStorage)
- **Minor** — additive method on an OPTIONAL namespace (`adapter.search?.someNewMethod`)
- **Major** — change required namespace shape, remove method, change return type

Currently `v0.2.0-alpha` — interface frozen pending Phase 1
implementation. First stable release tagged on Phase 4 ship.

---

## Related docs

- [Mega-slice lift plan](../rr-sync/2026-05-21-notion-mega-lift-plan.md) — 6-phase implementation
- [Site map](../rr-sync/2026-05-21-adapter-site-map.md) — every coupling site → adapter method
- [`FilesAdapter` precedent](./files.md) — the pattern this generalises
- [`docs/notion-mega-slice.md`](../notion-mega-slice.md) — pre-adapter API design
- [`CLAUDE.md` "Boundary-cast pattern for Convex FKs"](../../CLAUDE.md#boundary-cast-pattern-for-convex-fks-2026-05-16) — string-at-boundary rationale
