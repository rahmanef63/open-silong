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

## Owner / next checkpoint

Pick this back up after the legacy TS drift in `frontend/slices/databases`
and `frontend/slices/editor` is paid down (those are larger-blast-radius
items currently blocking `ignoreBuildErrors: false`). Re-evaluate when the
typecheck CI gate stops finding errors on a clean main.
