# Database Silong — INSTALL

Drop-in Notion-canonical database surface for any Next 16 + React 19
project. Ships 11 view types, 16 cell types, FilterBuilder, SortBuilder,
formula engine, public-form-as-view, and backend-agnostic NotionAdapter
contract (Convex / localStorage / your-own).

## Prereqs

| Tool / pkg | Version | Why |
|---|---|---|
| Node | ≥ 20 | Convex CLI + Next 16 |
| Next.js | ≥ 16 | App Router required (catch-all route uses `[[...slug]]`) |
| React | ≥ 19 | Hooks contract; `useSyncExternalStore` for adapter reactivity |
| Tailwind | v4 | Theme tokens (`bg-background`, `text-foreground`, `border-border`) |
| shadcn/ui | recent | Button, Input, Dialog, Popover, DropdownMenu, Select, Checkbox |
| `rahman-shared` | ^0.2 | `cn()` utility (imported by lifted slices) |
| Convex (optional) | ^1.36 | Production backend. Skip if localStorage demo is enough |

## Step 1 — Install the slices

```bash
npx rr add notion-database     # ← the database UI + views + cells
# (cascades notion-shell as a peer — domain types come from there)
```

Lands in your repo at:

```
frontend/slices/notion-database/
frontend/slices/notion-shell/
```

You **own** the files now. Customise freely.

## Step 2 — Pick a backend

### Option A — localStorage (zero infra, demo mode)

Already wired. Skip Step 3 + 4. Skip to Step 5.

### Option B — Convex production

```bash
pnpm add convex @convex-dev/auth
npx convex init           # if you don't already have convex/
```

## Step 3 — Merge the schema fragment

Copy `template-base/database-silong/convex/schema.database-silong.ts`
into your `convex/` directory, then merge into your `schema.ts`:

```ts
// convex/schema.ts
import { defineSchema } from "convex/server";
import { databaseSilongTables } from "./schema.database-silong";

export default defineSchema({
  ...databaseSilongTables,
  // your existing tables here
});
```

Regenerate the codegen:

```bash
npx convex codegen
```

## Step 4 — Add the convex backend handlers

Two options:

### Option B.1 — Lift open-silong's reference impl (recommended)

```bash
npx rr add notion-database-convex
# (placeholder — see ROADMAP.md; the Convex backend lift lands in v0.5)
```

### Option B.2 — Write your own

Reference impl: <https://github.com/rahmanef63/open-silong/tree/main/convex/databases.ts>

Required handlers:

| Function | Signature |
|---|---|
| `databases.list` | `query() → Database[]` |
| `databases.get` | `query({ dbId }) → Database \| null` |
| `databases.create` | `mutation({ name, icon }) → Id<"databases">` |
| `databases.update` | `mutation({ dbId, patch }) → void` |
| `databases.addProperty` | `mutation({ dbId, type, name? }) → string` |
| `databases.addRow` | `mutation({ dbId, init? }) → Id<"pages">` |
| `databases.setRowValue` | `mutation({ dbId, rowPageId, propId, value }) → void` |
| _(see WIRING.md for the full ~22-method list)_ | |

## Step 5 — Mount the provider

See [WIRING.md](./WIRING.md).

## Step 6 — Add the catch-all route

Copy `template-base/database-silong/app/db/[[...slug]]/page.tsx` to
your project at the same path. Visit `/db`.

## Step 7 — Verify

```bash
pnpm dev
# Open http://localhost:3000/db
```

You should see:
- Empty list (or seed data if you used the convex backend with seeds)
- "+ New database" button
- Creating a database lands at `/db/<id>` with default table view

## Troubleshoot

See [TROUBLESHOOT.md](./TROUBLESHOOT.md).

## Customise mount path

Default mount is `/db`. To mount at `/workspace/db` instead:

1. Move `app/db/` → `app/workspace/db/`
2. Update `routes.basePath` in the NotionAdapterProvider config:
   ```tsx
   <NotionAppProvider config={{ routes: { basePath: "/workspace/db" } }}>
   ```

That's it — every internal link adapts.
