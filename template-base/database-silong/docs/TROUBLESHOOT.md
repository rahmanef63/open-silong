# Database Silong — TROUBLESHOOT

Common errors + fixes. Sorted by where they bite.

## At install time

### `npx rr add notion-database` fails with "manifest not found"

- Update CLI: `npm i -g rahman-resources@latest`
- Check network: `curl -fsSL https://raw.githubusercontent.com/rahmanef63/resource-site/main/packages/cli/lib/manifest.json | head -5`

### Files land but slice manifest is empty

You're on an older CLI. `npx rr add notion-database@latest` to pull
v0.4+. The `--force` flag re-pulls + overwrites.

## At typecheck time

### `Cannot find module '@convex/_generated/api'`

```bash
npx convex codegen
```

If still failing, `convex/` doesn't exist yet:
```bash
npx convex init
# then re-merge schema fragment and re-run codegen
```

### `Cannot find module '@/slices/notion'`

The mega-bundle slice is separate from `notion-database`. Either:
- Install it: `npx rr add notion-shell` (peer of notion-database)
- Or import directly from `@/slices/notion-database` instead

### `Module 'rahman-shared/lib/utils' has no exported member 'cn'`

```bash
pnpm add rahman-shared@latest
```

### `Property 'workspaces' does not exist on type 'NotionAdapter'`

You're using v0.3 contract on v0.4 code. Update:
```bash
npx rr add notion-database --force
```

## At runtime

### `useNotionAdapter() called outside <NotionAdapterProvider>`

You forgot to mount the provider in `app/layout.tsx`. See WIRING.md.

If you already have it:
- Is the provider INSIDE `<ConvexAuthProvider>` (when using Convex)?
- Is the route file a Client Component (`"use client"`)?
- Check React DevTools — is `NotionAdapterProvider` actually in the tree?

### Page renders but database list is empty (Convex mode)

Three usual causes:

1. **Not signed in** — `auth.useCurrent()` returns null, so
   `databases.list` returns `[]`. Sign in via your auth flow first.

2. **Schema not deployed** — run `npx convex deploy` after merging the
   schema fragment.

3. **Different workspace** — multi-workspace mode shows only the user's
   active workspace. Check `userProfiles.activeWorkspaceId`.

### Page renders but database list is empty (localStorage mode)

```js
// Browser console
JSON.parse(localStorage.getItem("silong-demo:databases"))
// → if `{}` or `null`, no databases created yet. Click "+ New".
```

If you see entries but UI still empty, version mismatch — clear:
```js
Object.keys(localStorage).filter(k => k.startsWith("silong-demo:")).forEach(k => localStorage.removeItem(k))
```
Refresh.

### "Storage URL not available" toast on image upload

You're using a `FilesAdapter` impl that lacks `resolveUrl`. Either:
- Implement `resolveUrl()` on your adapter (returns URL via your CDN)
- Or use the bundled `useLocalStorageFilesAdapter` (data-URL fallback works without `resolveUrl`)

### View switcher shows the view but it renders blank

Property `type` mismatch — your row has a property value but the
property type in `databases.properties` doesn't match the value shape.
Run the FK audit:
```bash
npx convex run admin/fkAudit:run
```

### Drag-to-reorder rows doesn't persist

`databases.reorderRows` mutation isn't wired or returned an error.
Check Network tab + Convex dashboard logs.

## At catch-all route

### `/db` 404s

- File is at exact path `app/db/[[...slug]]/page.tsx` (note the DOUBLE
  brackets — that makes it optional catch-all, matching both `/db`
  AND `/db/anything`)
- File is a Client Component (first line: `"use client"`)
- Next dev server restarted after creating the file

### `/db/<dbId>` shows "Database not found"

- The id in the URL doesn't exist in your adapter's data
- Convex mode: are you signed in as the user who owns this database?
- localStorage mode: did you clear localStorage between sessions?

### Internal links use `/db/...` but I mounted on `/workspace/db/...`

You forgot to set `config.routes.basePath`:
```tsx
<NotionAppProvider config={{ routes: { basePath: "/workspace/db" } }}>
```
Without this, internal links assume the default `/db` mount.

## At deploy time

### Vercel build fails with "useStore is not a function"

You have leftover `useStore()` imports from a partial migration.
```bash
grep -rn "useStore\b" frontend/slices/notion-database/
```
Should be ZERO matches. If non-zero, run `npx rr add notion-database --force`.

### Convex deploy fails with "BadAdminKey"

Self-hosted Convex needs `--admin-key` flag. Use the `si-coder/deploy.js`
helper from open-silong, or pass `--admin-key=$CONVEX_SELF_HOSTED_ADMIN_KEY`
explicitly. Cloud Convex doesn't have this issue.

### Production page hangs at "Loading…"

Adapter context is fine, but `useList` returns `undefined` indefinitely.
Common causes:
- Convex query throws server-side — check Convex dashboard logs
- Schema mismatch — your `_generated/api.d.ts` is out of date.
  Run `npx convex codegen` and redeploy.

## Where to get help

| Issue type | Where |
|---|---|
| CLI bugs | <https://github.com/rahmanef63/resource-site/issues> |
| Slice bugs | <https://github.com/rahmanef63/open-silong/issues> |
| Convex deploy | <https://docs.convex.dev/self-hosting> |
| Adapter contract | `frontend/slices/notion/adapter/types.ts` (read the comments) |
