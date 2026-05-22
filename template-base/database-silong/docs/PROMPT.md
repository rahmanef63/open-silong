# Database Silong — AI Agent Integration Prompt

Drop this file into your consumer project at `.claude/database-silong.md`
(or anywhere your AI coding agent reads context from). When the user
asks "wire up database silong" or "fix my notion-database mount", your
agent reads this and knows exactly what to do.

---

## Context

User just ran `npx rr add notion-database` in this project. They want
the full Notion-canonical database experience working under `/db` (or
their chosen mount). The slice is shadcn-style — files are owned by
the consumer, no npm runtime dep.

## Architecture (read before touching code)

| Layer | File | Purpose |
|---|---|---|
| Routes | `app/db/[[...slug]]/page.tsx` | Catch-all — parses URL, renders the right surface |
| Provider | `app/layout.tsx` | Mounts `<NotionAppProvider adapter={...}>` (one tree-wide) |
| Slices | `frontend/slices/notion-database/` | UI: views, cells, builders |
| Slices | `frontend/slices/notion-shell/` | Page + sidebar + editor (peer of database) |
| Adapter | `frontend/slices/notion/adapter/types.ts` | `NotionAdapter` interface — backend abstraction |
| Adapter | `frontend/slices/notion/adapter/localStorageAdapter/` | Demo impl (browser-only persistence) |
| Adapter | `frontend/slices/notion/adapter/convexAdapter/` | Production impl (real-time, multi-user) |
| Schema | `convex/schema.database-silong.ts` | Convex table definitions (MERGE into user's `schema.ts`) |
| Backend | `convex/databases.ts` + `convex/pages.ts` | Queries + mutations (lift from open-silong reference impl) |

## Wiring checklist (do these in order)

1. **Verify slice install**
   ```bash
   ls frontend/slices/notion-database/index.ts  # must exist
   ls frontend/slices/notion-shell/index.ts     # must exist (peer)
   ```

2. **Pick adapter mode**
   Ask user: "Demo (localStorage) or production (Convex)?"
   - Demo → mount `useLocalStorageNotionAdapter()` — skip steps 3–5
   - Production → continue

3. **Verify Convex setup**
   ```bash
   ls convex/_generated/api.ts  # exists?
   cat convex/schema.ts          # has databases + pages tables?
   ```
   If no `_generated/`, run `npx convex dev` once.
   If no schema, merge `template-base/database-silong/convex/schema.database-silong.ts`.

4. **Verify backend handlers exist**
   ```bash
   ls convex/databases.ts convex/pages.ts
   ```
   If missing, lift from `https://github.com/rahmanef63/open-silong/tree/main/convex/`.

5. **Mount the provider in `app/layout.tsx`**
   See WIRING.md. The provider MUST wrap every route that uses `/db`.
   For Convex mode: provider goes INSIDE `<ConvexAuthProvider>` because
   `useConvexNotionAdapter` reads auth state.

6. **Install the catch-all route**
   Copy `template-base/database-silong/app/db/[[...slug]]/page.tsx`
   to the user's `app/db/[[...slug]]/page.tsx`.

7. **Verify env vars**
   ```bash
   grep -E "CONVEX_URL|NEXT_PUBLIC_CONVEX_URL" .env.local
   ```
   If Convex mode, both required. See WIRING.md.

8. **Smoke test**
   ```bash
   pnpm typecheck && pnpm dev
   ```
   Open `/db`. Create a database. Add a property. Add a row.

## Common consumer questions

> "I want to mount on `/workspace/db` not `/db`"

Move the route directory:
```bash
mv app/db app/workspace/db
```
Then update the provider config:
```tsx
<NotionAppProvider config={{ routes: { basePath: "/workspace/db" } }}>
```
All internal links auto-adapt — `useNotionConfig().routes.*`.

> "I don't want the AI features"

```tsx
<NotionAppProvider config={{ features: { ai: false } }}>
```
Hides every AI-driven button + skips loading AI provider code.

> "How do I customise the property cells?"

Override via the `components` prop:
```tsx
<NotionAppProvider
  components={{
    PropertyCell: MyCustomCell,
  }}
>
```
Your custom component receives `{ property, value, onChange }` props.
See `frontend/slices/notion-database/PropertyCell.tsx` for the signature.

> "Can I use Supabase instead of Convex?"

Yes — implement the `NotionAdapter` interface:
```ts
export function useSupabaseNotionAdapter(): NotionAdapter {
  return {
    pages: {
      useList: ({ workspaceId }) => {
        const { data } = useSWR(`/api/pages?ws=${workspaceId}`);
        return data;
      },
      // ... 13 more methods
    },
    databases: { /* 22 methods */ },
    files: { /* 4 methods */ },
  };
}
```
See `frontend/slices/notion/adapter/types.ts` for the full interface.

> "Typecheck fails: Cannot find module '@convex/_generated/api'"

Run `npx convex dev` once (or `npx convex codegen` if your deploy
config is already set). This generates the type stubs from your schema.

> "How do I add my own view type beyond the 11 built-in?"

Register it in your project's `viewRegistry`:
```ts
import { VIEW_REGISTRY } from "@/slices/notion-database";

VIEW_REGISTRY.set("my-custom-view", {
  label: "My View",
  icon: MyIcon,
  Component: MyViewRenderer,
});
```
Your renderer receives `{ db, rows, config }` — same contract as the
built-in views. See `frontend/slices/notion-database/views/TableView.tsx`
for a minimal reference.

## DO NOT

- ❌ Don't import directly from `@/slices/notion-database/internal/*` —
  use the slice's barrel (`@/slices/notion-database`) only. The internal
  paths can change between minor versions.
- ❌ Don't write directly to localStorage when using Convex adapter —
  it WILL get out of sync. Always go through `useNotionAdapter()`.
- ❌ Don't wrap each `app/db/*` route in its own provider — one top-level
  provider in `app/layout.tsx` is sufficient (and required for correct
  cross-route state).
- ❌ Don't bypass the adapter to call convex mutations directly from UI —
  it works but defeats the abstraction. Future-you will thank present-you
  for going through `useNotionAdapter().databases.update(...)`.

## Useful one-liners

```bash
# Reset demo data (localStorage mode)
localStorage.clear()

# Print current adapter from browser console
window.__NOTION_ADAPTER__?.constructor.name

# Re-run codegen after schema edits
npx convex codegen

# List installed notion-* slices
ls frontend/slices/ | grep notion
```
