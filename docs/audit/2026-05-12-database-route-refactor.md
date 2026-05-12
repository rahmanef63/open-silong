# Architectural refactor — databases as first-class routable entities

**Date 2026-05-12.** Captures the database-vs-page split shipped today
and the porting implications.

## What changed

| Concept | Before | After |
|---------|--------|-------|
| Database canonical home | A host page (`databaseHostFor: [dbId]` marker, single `database` block) | `/dashboard/db/[id]` route, no host page |
| "Open as page" button | createPage + addBlock + updateBlock + updatePage chain (4 round-trips, 2 fire-and-forget) | `navigate(ROUTES.database(db.id))` (1 line, 0 mutations) |
| `pages.databaseHostFor` field | Required for canonical-host lookups | Deprecated marker. Triggers a redirect; never stamped on new pages |
| Sidebar database row click | `pages.find(p => p.databaseHostFor?.includes(db.id))` → `/p/<host>` | `/db/<dbId>` direct |
| Library database open | Same host-page lookup | Same — direct route |
| Command palette + search | Same | Same — direct route |
| Row peek breadcrumb | "back to host page" via `window.history.back()` | "back to database" via `navigate(ROUTES.database)` |
| PageEditor on legacy host page | Renders the DB inside the page, swaps title for db.name | `router.replace(/db/[dbId])` and short-circuits render |

## Why

The trigger was a single user bug report: clicking "Open as page" on
the `Interactions` database navigated to an empty `Personal CRM` page
(matchKind: marker, hostBlocksCount: 0). The host had been edited —
DB block deleted — but the marker stayed, leaving the database
inaccessible.

Root architectural mismatch: **pages have blocks, databases have rows**.
Embedding a database inside a page-as-block treats two distinct shapes
as composable when they aren't. Every edit to the host page can
desynchronize the marker, and the marker has no schema-level link to
keep them consistent.

Fix: separate the two surfaces. A database is its own URL, its own
component, its own lifecycle. A page can still embed a database
*inline* (the existing `database` block type still works for embedded
views), but the canonical "full-page" surface is now `/db/[id]`, not
"a page that happens to host the database."

## Porting playbook (what a downstream agent must do)

### Minimum to copy the database feature

```
frontend/slices/databases/        # entire slice (incl. row/, row-selection/, views/, lib/, components/)
frontend/shared/components/icon-picker/  # DynamicIcon + IconPickerPopover (slice depends on this hub)
frontend/shared/lib/routes.ts     # ROUTES.database / ROUTES_ABS.database
frontend/shared/lib/router/       # RouterProvider + useNavigate hooks
frontend/shared/lib/store/...     # useStore + per-domain hooks (databases, blocks, pages)
frontend/shared/types/domain.ts   # Database, Page, Block, etc.
app/dashboard/db/[id]/page.tsx    # the route entry — copy as-is
convex/databases.ts               # backend mutations/queries
convex/_shared/                   # auth helpers, workspace gating, rate limiting
convex/schema.ts (databases + pages tables, workspaces, userProfiles, workspaceMembers)
```

Run `node scripts/copy-slice.mjs databases --to <dest>` to get the
recursive copy with manifest resolution.

### Provider stack a target project needs

```tsx
<RouterProvider basename="/your-dashboard-prefix">
  <StoreProvider>           {/* useStore + per-domain hooks */}
    <WorkspaceIOProvider>   {/* optional, only if export/import used */}
      <PageHeaderSlotProvider>
        {/* your routes including /db/[id] */}
      </PageHeaderSlotProvider>
    </WorkspaceIOProvider>
  </StoreProvider>
</RouterProvider>
```

`PageHeaderSlotProvider` is required because `DatabasePage` mounts a
slot for the breadcrumb header.

### Backend prerequisites

- Convex self-hosted or cloud, version compatible with `1.36+`.
- `pages` table with `databaseHostFor: v.optional(v.array(v.string()))`
  — keep the field even though deprecated. Existing data with the
  marker drives the redirect in PageEditor; without the field, the
  redirect would never fire and legacy pages would render as empty
  host pages.
- `databases` table with `properties`, `rowIds`, `views`, etc. See
  `convex/schema.ts` for the full shape.
- `workspaceMembers` join table for membership-aware reads. If your
  target project is single-workspace, you can stub this with a single
  row per user, but the `requireWorkspaceMember` helper expects the
  table to exist.

### Routing checklist

- [ ] Add route file at `<your-base>/db/[id]/page.tsx` rendering
      `<DatabasePage />` (or wrap with auth guard).
- [ ] Wrap layout with `<RouterProvider basename="<your-base>">`.
- [ ] Verify `ROUTES.database(id)` resolves to the right URL in your
      mount (default returns `/db/:id`; basename gets prepended).
- [ ] No need to wire a redirect from `/p/[id]` — PageEditor handles
      legacy host pages internally.

### Gotchas

1. **Hook order in PageEditor**. The legacy-host redirect `useEffect`
   sits ABOVE the `fullPage === undefined` early return. Don't reorder
   it below — React error #310 (the bug fixed in `cc09300`).
2. **DatabaseBlock.fullPage is opt-in**. Inline embeds inside a regular
   page (rendered via the editor's `database` block type) DO NOT pass
   `fullPage=true`. Only `DatabasePage` (the `/db/[id]` route) does.
3. **isInline = !fullPage**. Inline embeds get the maximize button +
   the linked-badge logic. Full-page hides both.
4. **databaseHostFor as redirect hint**. Don't remove the field from
   the schema or stop writing it to existing data — the migration
   relies on reading it. New code does not write it.
5. **Row peek "showOpenAsPage" defaults to true**. DatabaseBlock passes
   `showOpenAsPage={isInline}`, so on `/db/[id]` the page button is
   hidden (you're already on the page). On inline embeds inside pages,
   it's shown.
6. **Synthetic block id**. `DatabasePage` constructs a synthetic block
   with id `__fullpage_${dbId}__`. This id is never persisted; if you
   serialize the page tree, filter blocks whose id starts with `__`.

## Re-confirmed portability scores

| Severity | Before today | After today |
|----------|--------------|-------------|
| A (drop-in)   | 11 slices | 13 slices (DatabasePage + RowPeek now exportable) |
| B (cluster)   | 18 slices | 16 slices |
| C (entangled) | 1 slice (editor) | 1 slice (editor) |

Net: databases slice moved from B to A. The "open as page" coupling
that previously needed callerPageId + pages array + 4 mutations is
gone — it's now a pure navigate call.

## Console / debug instrumentation

The heavy `[openAsPage]` console.log instrumentation added in
`bff8d04` was removed in this cycle (`cc09300+1`). It served its
purpose — it surfaced the matchKind=marker / hostBlocksCount=0 bug
that drove the refactor. Production code should not log on every
"Open as page" click.

## Verification

```
npx tsc --noEmit       # clean
npx next build         # registers /dashboard/db/[id] alongside /dashboard/p/[id]
node scripts/generate-slice-manifests.mjs   # 35 manifests refreshed
```

Browser smoke test:
1. Click any database in sidebar → lands on `/dashboard/db/[id]`
2. Click "Open as page" maximize on an inline embed → same destination
3. Open a legacy host page directly via old `/p/[host-id]` URL →
   redirects to `/db/[dbId]` (if the marker's referenced DB exists)
4. Open a legacy host page whose DB was deleted → renders normally so
   you can clean up the orphaned content
