# Slice creation playbook

Steps to add a new feature slice, slimmed for this stack
(Next + Convex + React).

## 1. Create folders

```bash
NAME=inbox
mkdir -p src/slices/$NAME/{components,hooks,lib,views}
mkdir -p convex/features/$NAME
```

## 2. Frontend skeleton

`src/slices/<name>/types.ts` — slice-local types
`src/slices/<name>/hooks/use<Name>.ts` — Convex bindings
`src/slices/<name>/components/<X>.tsx` — UI pieces (≤ 200 lines)
`src/slices/<name>/views/<Name>Page.tsx` — route entry (if routable)
`src/slices/<name>/index.ts` — barrel exporting public surface

Barrel template:

```ts
export { useInbox } from "./hooks/useInbox";
export { InboxPage } from "./views/InboxPage";
export { InboxBadge } from "./components/InboxBadge";
export type { Notification, NotificationKind } from "./types";
```

## 3. Backend skeleton

`convex/features/<name>/queries.ts`
`convex/features/<name>/mutations.ts`
`convex/features/<name>/index.ts` (barrel: `export * from "./queries"; export * from "./mutations";`)

Schema additions go in `convex/schema.ts` under a comment header:

```ts
// === inbox ===
notifications: defineTable({
  userId: v.id("users"),
  kind: v.string(),
  // …
}).index("by_user", ["userId"]),
```

## 4. Wire to app

- Routable feature → add a `<Route>` in `src/App.tsx` importing from the slice barrel.
- Embed-only feature → import the barrel where it's used.

## 5. Replace any hardcoded stand-ins

If the feature replaces an existing stub (e.g. hardcoded "3" inbox badge or
"Comments coming soon" toast), grep and remove them in the same commit.

## 6. Validate

```bash
npx tsc --noEmit && npm run build
```

## 7. Commit

```
feat(<name>): <one-line summary>

- bullet
- bullet
```

## Anti-patterns

- ❌ A `slice/<name>/components/index.tsx` re-rendering five concerns — split.
- ❌ Importing from `src/slices/other/components/Internal.tsx` — go through the barrel.
- ❌ Adding a `useNotificationsAndComments` hook spanning two slices — make it two hooks, compose at the call site.
- ❌ Hardcoding test data in the component (`const items = [{ id: 1, ... }]`) — load from Convex, even for stubs (Convex returning `[]` is fine while empty).
