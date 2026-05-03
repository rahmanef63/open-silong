# Nosion — Claude / Agent Conventions

Block-based notes app. Next 16 (App Router) + React 19 + Convex 1.36 self-hosted.
Live: https://nosion.rahmanef.com · Convex: https://api-notion-page-clone.rahmanef.com

## Layout

- `app/` — App Router routes. Dashboard segments live under `/dashboard/*`.
  Pre-prefix legacy URLs (`/p/:id`, `/inbox`, `/settings`, …) redirect via
  `next.config.mjs` → `/dashboard/<same>`.
- `frontend/slices/{slug}/{components,views,hooks,lib}/` — feature slices.
  No `defineFeature()` / `config.ts` / `init.ts` shell here. Slices export
  via `index.ts` and are consumed directly by `app/` routes.
- `frontend/shared/{ui,lib,components,types}/` — primitives shared across
  slices.
- `convex/` — backend (queries/mutations/actions, schema, auth).
- `proxy.ts` — Next 16 request boundary (Convex auth optimistic gate, NOT
  the security boundary).

`audit-bp/scripts/audit-features.sh` does NOT apply here — it enforces the
Manef/SuperSpace canonical feature shell which Nosion does not adopt.
Ignore its grades. `audit-bp.sh` itself is fine.

## Navigation

- Inside dashboard: `useRouter()` + `usePathname()` from `next/navigation`,
  prefix with `BASE = "/dashboard"`. See `AppSidebar.tsx`'s `path()` for the
  pattern. The legacy `@/shared/lib/router-compat` shim still exists for
  large untouched files; new code should use `next/navigation` directly.
- Outside dashboard (auth, marketing, /share): plain `next/link` + `useRouter`.

## Deploy

- **Convex functions** — `convex-deploy.yml` GitHub Action runs
  `npx convex deploy --yes` with `CONVEX_SELF_HOSTED_*` env vars. For local
  pushes use `node si-coder/deploy.js` — raw `npx convex deploy` from a
  developer machine returns `BadAdminKey` against the self-hosted instance.
- **Frontend** — Dokploy app (`notion-page-clone-app-2tk1pq`) builds from
  main and serves via Traefik fronting the standalone Next image.
- **Backend** — `docker-compose.yml` runs Convex backend pinned to
  `5143-7adfedc`. Postgres-backed (`POSTGRES_URL` required). Ports bound
  to `127.0.0.1` only — Dokploy/Traefik fronts TLS.

After every commit, push to `origin/main` without asking. Always create
new commits, never amend.

## Feature flags / discipline

- Server Actions: every `"use server"` performs authn + authz; never return
  raw DB rows; use DTOs.
- Convex public fns: `args: { ... v.* }` validators are mandatory, plus a
  permission check before any DB write.
- No raw `<a>` for internal routes; no raw `<img>` for hosted assets.
- `ResponsiveDialog`, `DateField`, `<FileUpload>` primitives live in
  `frontend/shared/`.

## Audit / review

- Latest holistic audit: `docs/audit/2026-05-03-audit-bp.md` (full scope)
  + delta findings appended to that doc per cycle.
- Cache Components deferral: `docs/audit/cache-components.md`.
