# Architecture — slice flow

Borrowed from Superspace (`~/projects/superspace/docs/guides/01-FEATURE-CREATION.md`)
and adapted for this Vite + Convex + React project.

## Directory layout

```
src/
├── app/                    # entry, providers, router (App.tsx, main.tsx)
├── slices/                 # feature slices — one folder per feature
│   ├── inbox/
│   ├── comments/
│   ├── files/
│   ├── pages/              # the notion page editor (legacy ⇢ being migrated)
│   ├── databases/          # the database engine (legacy ⇢ being migrated)
│   ├── workspace/          # sidebar, dashboard, search modal
│   ├── auth/
│   ├── snapshots/          # version history
│   ├── sharing/
│   ├── trash/
│   └── settings/
├── shared/                 # cross-cutting code
│   ├── ui/                 # shadcn primitives (Button, Popover, Dialog, …)
│   ├── lib/                # utils, format, keyboard, markdown, cn
│   ├── hooks/              # use-mobile, use-toast
│   └── types/              # cross-feature types only

convex/
├── schema.ts               # single merged schema (Convex constraint)
├── auth.ts, auth.config.ts
└── features/
    ├── inbox/{queries,mutations,index}.ts
    ├── comments/{queries,mutations,index}.ts
    ├── files/{queries,mutations,index}.ts
    └── …
```

## Slice anatomy

Every slice has the same shape (omit empties):

```
src/slices/<name>/
├── index.ts                # public barrel — re-export only what's consumed externally
├── components/             # presentational + small stateful components
│   └── <Component>.tsx
├── views/                  # page-level / route-level components
│   └── <Name>Page.tsx
├── hooks/                  # data + behavior hooks
│   └── use<Name>.ts
├── lib/                    # pure functions (formatters, parsers, validators)
│   └── <name>.ts
└── types.ts                # types specific to this slice
```

A slice may export:
- **Components** consumed by other slices' UIs
- **Hooks** for reading slice data from outside
- **Types** that flow across slice boundaries

A slice may *not*:
- Import from a sibling slice's internal files (`src/slices/inbox/components/X` from `comments/`).
  Always go through the barrel: `import { X } from "@/slices/inbox"`.
- Mutate shared state outside its own concern.

## Hook pattern

```ts
// src/slices/inbox/hooks/useInbox.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";

export function useInbox() {
  const items = useQuery(api.features.inbox.queries.list);
  const markRead = useMutation(api.features.inbox.mutations.markRead);
  const unreadCount = (items ?? []).filter((n) => !n.read).length;

  return {
    isLoading: items === undefined,
    items: items ?? [],
    unreadCount,
    markRead,
  };
}
```

Conventions:
- Loading state derived from `data === undefined` (Convex returns undefined while loading).
- Hook returns a flat object: `{ isLoading, …data, …mutations }`.
- No setState ping-pong — Convex queries are reactive.

## Convex feature module

```ts
// convex/features/inbox/queries.ts
import { query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
```

```ts
// convex/features/inbox/index.ts (barrel for client imports via api.features.inbox.*)
export * from "./queries";
export * from "./mutations";
```

The Convex code-gen produces `api.features.inbox.queries.list` etc.

## Routing

`src/app/routes.tsx` (or `App.tsx`) imports each slice's view from its barrel:

```tsx
import { InboxPage } from "@/slices/inbox";

<Route path="/inbox" element={<InboxPage />} />
```

No deep imports across slice boundaries.

## File-size discipline

Soft target: 200 lines.
When approaching, split by responsibility:

- **Components** → extract subcomponents to `components/`
- **Hooks** → split mutations vs. derived state into separate hooks
- **Util files** → split by domain (e.g. `markdown/serialize.ts`, `markdown/parse.ts`)

A 500-line file is a code smell, not a milestone.

## Migration plan (legacy code)

The current `src/lib/store.tsx` (888 lines) is a single React Context wrapping
all Convex bindings. Target: dissolve into per-slice hooks (`usePages`,
`useDatabases`, `useSnapshots`, …) that call Convex directly. Components migrate
slice-by-slice, with `useStore()` deprecated last.

Tracked in `.claude/DEBT.md`.

## Naming

| Thing                  | Convention                       |
| ---------------------- | -------------------------------- |
| Slice folder           | `kebab-case` (e.g. `page-actions`) |
| Convex feature folder  | `camelCase` (e.g. `pageActions`) |
| Hook                   | `use<PascalCase>` (`usePageActions`) |
| Component              | `<PascalCase>` (`PageActionsMenu`) |
| Page/view component    | `<Name>Page` (`InboxPage`)       |
| Type                   | `<PascalCase>` (`NotificationKind`) |
