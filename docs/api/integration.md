# Integration guide — consuming pages + databases from a new feature

This guide is for slice authors who want to read or mutate pages /
databases / blocks without re-implementing the data layer.

> Pre-reqs: `docs/api/pages.md`, `docs/api/databases.md`,
> `docs/api/blocks.md`, `docs/types/domain.md`. Read those first —
> this doc only covers the integration patterns.

---

## TL;DR — pick a path

| What you want | Use |
|---|---|
| List pages in a sidebar / dashboard / palette | `useStore().pages` (slim `listMeta` underneath) |
| Render the active page editor | `useFullPage(pageId)` — direct `getById` subscription |
| List databases | `useStore().databases` (or `trashedDatabases`) |
| Mutate a page | `useStore().{updatePage, addBlock, updateBlock, ...}` |
| Mutate a database | `useStore().{updateDatabase, addRow, deleteRow, ...}` |
| Subscribe to one page from a server component | `fetchQuery(api.pages.getById, {id})` |
| Read a public-share view server-side | `fetchQuery(api.pages.getPublicShare, {id})` |
| Call a Convex fn directly (rare) | `useMutation` / `useQuery` from `convex/react` |

---

## The store hook (`useStore`)

`frontend/shared/lib/store.tsx`. One global React context — there is
no Redux, Zustand, or Jotai. The store wraps Convex's reactive
subscription model with derived collections and stable callbacks.

```ts
const {
  // collections (reactive)
  pages,                    // Page[] — slim DTO (no blocks)
  databases,                // Database[] (non-trashed)
  trashedDatabases,         // Database[] (trashed)
  recents,                  // string[] — recent page ids
  preferences,              // Preferences

  // active surface
  user, workspace,
  isInitialLoading,         // first-mount Convex round-trip
  saving,                   // legacy flag, currently always false

  // page actions
  createPage, updatePage, deletePage, restorePage,
  permanentlyDeletePage, duplicatePage,
  toggleFavorite, togglePublic, toggleLocked,
  setIcon, setCover, setTitle, setFont, setSmallText, setFullWidth,
  applyTemplate,
  addBlock, updateBlock, deleteBlock, reorderBlocks, duplicateBlock,
  childrenOf, getPage, getDatabase,

  // database actions
  createDatabase, updateDatabase, deleteDatabase, restoreDatabase,
  permanentlyDeleteDatabase,
  addRow, deleteRow, setRowValue, setActiveView,
  addProperty, renameProperty, deleteProperty, changePropertyType,
  reorderProperties, addView, renameView, deleteView, duplicateView,
  setSort, setFilter, setHidden,

  // version history
  snapshots, snapshotsForPage, restoreSnapshot,

  // undo/redo (in-memory, structural + text)
  undo, redo, canUndo, canRedo,

  // auth
  signOut,
} = useStore();
```

Every mutation is wrapped — calling `updatePage(id, patch)`:
1. Optimistically updates the in-memory Convex query cache (Convex
   handles this automatically when the subscription matches).
2. Sends `api.pages.update` over WebSocket.
3. Convex broadcasts the patched doc back to all subscribers.
4. React re-renders the affected components.

You DON'T need to await the mutation result for UI updates — the
optimistic + reactive path covers that.

---

## Reading a single page (full doc with blocks)

`useStore().pages` is the slim DTO — `blocks` are NOT populated.
For the active editor, subscribe to the full doc:

```ts
import { useFullPage } from "@/slices/editor/hooks/useFullPage";

function MyEditor({ pageId }: { pageId: string }) {
  const page = useFullPage(pageId); // null while loading
  if (!page) return <Skeleton />;
  return <BlockList blocks={page.blocks} />;
}
```

`useFullPage` is a thin `useQuery(api.pages.getById, {id})` wrapper.
Subscribing this way keeps the WebSocket payload bounded — block edits
on this page broadcast only to subscribers of THIS page, not the whole
workspace.

---

## Mutation idempotency + rate limits

Hot mutations are rate-limited server-side via
`convex/_shared/rateLimit.ts` (fixed-window counter):

| mutation | scope | window |
|---|---|---|
| `pages.create` | `pages.create` | 60 / minute |
| `comments.create` | `comments.create` | 30 / minute |
| `inbox.create` | `inbox.create` | 100 / minute |
| `ai.complete` | `ai.complete` | 20 / hour |
| `import.workspace.importFromJson` | `import.workspace` | 3 / minute |

Hitting the limit throws a user-facing error (Frontend reportError
sanitizes into a toast). The frontend SHOULD NOT retry automatically
on rate-limit errors — bubble to the user.

Daily prune cron `convex/maintenance.pruneRateLimits` clears expired
rows. The `rateLimits` table never grows unbounded.

---

## Error surface

Every public mutation throws via `throw new Error(message)`. Frontend
calls flow through:

```ts
import { reportError, sanitizeError } from "@/shared/lib/error";
import { toast } from "sonner";

try {
  await updatePage(pageId, patch);
} catch (err) {
  const safe = reportError("MyFeature.action", err);
  toast.error(safe.message);
}
```

`reportError` logs the raw error to the console for devtools, then
returns `{message: string}` with the user-safe message. NEVER show
raw Convex error stacks in UI — they leak schema, function paths, and
internal types.

---

## Mutation guard (write protection)

`frontend/shared/lib/store/mutationGuard.ts` runs sanity checks before
sending high-risk patches:

- Database property delete — strips referenced ids from views
- View delete — auto-activates a sibling view
- Workspace JSON import — multi-phase id remap

If you find yourself doing the same cleanup in every callsite, add it
to the guard rather than copy-paste.

---

## Subscribing from a Server Component

App Router server components use `convex/nextjs:fetchQuery`:

```ts
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  const page = await fetchQuery(api.pages.getPublicShare, { id });
  if (!page) notFound();
  return <SharedPageView page={page} />;
}
```

For metadata + page handler dedupe inside a single request, wrap the
loader in `React.cache`:

```ts
const loadShare = cache(async (id: string) =>
  fetchQuery(api.pages.getPublicShare, { id })
);
```

---

## Adding a new public Convex function

Checklist:

1. **Args validators** — every field declared via `v.*`. No bare
   strings except for legacy `pageId: v.string()` (cast in handler).
2. **Auth gate** — `requireAuth(ctx)` or `requireOwned(ctx, table,
   id)`. Anonymous reads must explicitly skip.
3. **Length caps** — text fields capped in handler (titles 200,
   comments 5000, search prefixes 200). Server-side, NOT client.
4. **Rate limit** — for any user-initiated mutation that's not
   typed-on-keystroke, add `rateLimit(ctx, userId, {scope, max,
   windowMs})`.
5. **DTOs on read** — never return raw `userId` / `searchText` /
   `rowProps` to anonymous viewers. Project to a public DTO.
6. **Update generated types** — `convex/_generated/api.d.ts` is
   normally codegen-only, but in this repo the file is hand-edited
   (codegen is gated by env vars). If you add a new module file,
   also add an entry in the `fullApi` shape there.
7. **Match conventions** — see `docs/api/conventions.md` for the
   exhaustive rule list.

---

## Adding a new slice that consumes pages/databases

Recommended layout:

```
frontend/slices/<slug>/
├── index.ts                  # public re-exports
├── components/               # UI
├── hooks/                    # custom hooks (often `use<Slug>`)
├── lib/                      # pure helpers + tests
└── types/index.ts            # slice-local types
```

Composition pattern:

1. Slice consumes `useStore()` for cross-page state, `useFullPage`
   for the active page when it cares.
2. Slice does NOT call Convex queries / mutations directly unless
   the data is local to the slice (e.g. comments has its own
   `convex/features/comments/queries.ts`).
3. Slice exposes a typed surface via `index.ts`. App routes import
   from `@/slices/<slug>` only.
4. Cross-slice data flow goes through `useStore` — slices don't
   import from each other's internals.

Example slice consumption:

```ts
// frontend/slices/my-feature/components/MyView.tsx
import { useStore } from "@/shared/lib/store";
import { useFullPage } from "@/slices/editor/hooks/useFullPage";
import { renderInline } from "@/shared/lib/inlineMd";

export function MyView({ pageId }: { pageId: string }) {
  const { databases, addBlock } = useStore();
  const page = useFullPage(pageId);
  if (!page) return null;

  return (
    <div>
      <h1>{renderInline(page.title)}</h1>
      <button onClick={() => addBlock(pageId, page.blocks.length - 1)}>
        + block
      </button>
    </div>
  );
}
```

---

## Testing

- Pure helpers: `vitest` co-located (`*.test.ts` next to the file).
  130 tests today (block tree, multi-move, formula engine, inline
  md, parse, error sanitizer, format helpers).
- Convex functions: no server-side test harness in this repo.
  Trust the type system + manual smoke. If you need confidence,
  spin a local `convex dev` deployment and exercise via the
  generated client.
- UI: no E2E today. Manual smoke + production canary.
