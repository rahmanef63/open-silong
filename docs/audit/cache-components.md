# Cache Components — deferral note

`next.config.mjs` keeps `cacheComponents` commented out. This doc records
why and what unblocks the flip.

## Why deferred

Next 16's Cache Components requires every route to either:

1. Sit under an explicit `<Suspense>` boundary, or
2. Carry an explicit `"use cache"` directive (with optional `cacheTag` /
   `cacheLife`).

Routes that use neither become build errors once `cacheComponents: true`.

`app/layout.tsx` wraps `{children}` in `<Suspense fallback={null}>`, but
`ConvexAuthNextjsServerProvider` (the outer wrapper) reads cookies on
every request — that makes the entire tree dynamic by default and the
Suspense boundary inside it doesn't recover that.

The dashboard tree is fine: it's a client tree past `DashboardShell` and
its server entrypoint just renders the shell. The problem is the marketing
landing (`app/page.tsx`) and the public share route
(`app/share/[id]/page.tsx`) — they should be statically cacheable but the
cookie-reading auth provider makes them dynamic-by-default.

## What unblocks the flip

Two paths, pick one:

### Path A — Move the auth provider down

Lift `ConvexAuthNextjsServerProvider` out of `app/layout.tsx` and into a
nested layout under `app/(authed)/layout.tsx` or
`app/dashboard/layout.tsx`. The root layout becomes pure-static; the
authed branch keeps the cookie-reading wrapper.

Trade-off: `proxy.ts` already gates the dashboard, so this is safe. The
shared marketing layout (top nav, footer) becomes truly static — first
paint goes from server-render-on-every-request to served-from-edge-cache.

### Path B — Embrace `"use cache"` per route

Leave the layout as-is, annotate `app/share/[id]/page.tsx` and
`app/page.tsx` with `"use cache"` + a stable `cacheTag` per page id. The
auth wrapper's cookie read becomes a noop on these routes because they
don't render any of its consumers.

Trade-off: cookie read still happens server-side per request (waste), but
the diff is smaller.

## Exit criteria

- All routes either use `"use cache"` or sit behind `<Suspense>`.
- `next build` passes with `cacheComponents: true`.
- Lighthouse on `/share/<id>` reports `Cache-Control: max-age=...` from
  the edge, not `private, no-cache`.
- Manual smoke: open the share URL twice in fresh tabs; second hit serves
  from `.next/cache/v1/...` not Convex.

## Concrete scope (2026-07-16 — Path A, verified)

Round-2 perf audit re-confirmed this is the biggest untouched lever for
public-route perf/SEO. `app/layout.tsx:94` wraps `<html>` in
`ConvexAuthNextjsServerProvider`, an async server component that
`await`s request cookies unconditionally → the whole tree is dynamic and
`cacheComponents:true` cannot be enabled. Additionally `app/providers.tsx`
boots the full realtime stack (ConvexReactClient + auth handshake +
`FilesProvider` + `VersionWatcher` 5-min poll) on anonymous `/share` and
`/site` visitors that use **zero** Convex client hooks.

**Route classification (verified against source):**
- `app/share/[id]`, `app/site/[ws]` — pure `fetchQuery` RSCs, **no** Convex
  client hooks. `ShareThemeBoot` handles theme via `matchMedia`. Need
  neither the auth server provider nor the realtime client.
- `app/forms/[slug]` — RSC shell, but `PublicFormClient` uses `useMutation`
  → needs a plain client `ConvexProvider` (NOT the cookie server provider),
  and likely `FilesProvider` (file-property inputs via `PropertyFormInput`).
- `app/page.tsx` (landing) — uses `useConvexAuth` (line ~20) → must stay in
  the authed group.
- `app/dashboard/*`, `app/auth`, `app/setup`, `app/oauth` — authed / private.

**Steps:**
1. `app/layout.tsx` → pure-static shell only: `<html>/<body>`, fonts,
   metadata/`HeadHints`, `InstallPrompt`, and the `AnalyticsBeacon` +
   `GoogleAnalytics` Suspense. Remove `ConvexAuthNextjsServerProvider` and
   `<Providers>` from here.
2. `app/(app)/layout.tsx` → `<ConvexAuthNextjsServerProvider><Providers>`
   {children}`</Providers></…>`. Move `dashboard/`, `auth/`, `setup/`,
   `oauth/`, and `page.tsx` (landing) into `(app)/` — route groups don't
   change URLs, so `/` still resolves.
3. `app/(public)/layout.tsx` for `share/` + `site/` — no Convex provider;
   just theme handling (mirror `ShareThemeBoot`; `/site` relies on theme
   tokens so give it an equivalent `matchMedia` boot).
4. `forms/` → a public layout that mounts a **plain** `ConvexProvider`
   (client, no cookie server provider) + `FilesProvider`. Verify the file
   inputs before dropping `FilesProvider`.
5. Flip `cacheComponents: true` (`next.config.mjs:48`), mark `loadShare` /
   `loadSite` / `loadForm` `"use cache"` + `cacheTag('share-'+id)` +
   `cacheLife('hours')`; `revalidateTag` on the publish/unpublish mutation.

**Risks / decisions before implementing:**
- `VersionWatcher` + `SonnerToaster` live at root deliberately (the
  "new version" toast shows on `/auth`, `/share`, etc.). Relocating them into
  `(app)` removes that toast from public tabs — decide whether to duplicate a
  lightweight version check on the public layout.
- `ThemeProvider` (next-themes) is in `Providers`; the public layout must
  handle theme without it (`/share` already does via `ShareThemeBoot`).
- `cacheComponents:true` makes EVERY remaining route a build error unless it
  is `"use cache"` or `<Suspense>`-wrapped — budget a pass over all routes +
  a full `next build` verification. Non-mechanical, medium-large blast radius.

## Owner / next checkpoint

Ready to implement — the earlier blocker (legacy TS drift blocking
`ignoreBuildErrors:false`) is cleared; typecheck is green on clean main.
This is a dedicated-session task (route-group restructure + `next build`
verification), not a drive-by. See progress tracker
`docs/audit/2026-07-16-perf-round2.md`.
