# open-silong

**Open-source collaborative workspace, built for everyone.**

An open-source Notion-inspired workspace for teams and personal use —
self-hostable, block-based, with multi-workspace, real-time sync,
sharing, comments, snapshots, and a polished editor.

Live demo · [silong.rahmanef.com](https://silong.rahmanef.com)
License · MIT
Stack · Next 16 (App Router) · React 19 · Convex 1.36 · Tailwind v4 · shadcn

---

## Why open-silong?

- **All your notes, your server.** Self-host the whole stack (Next +
  Convex via Docker Compose) and own your data.
- **Notion-grade UX.** Block editor with slash menu, inline-markdown
  decorator, drag-handle reorder, cover image. Databases with 6
  views (Table / Board / List / Gallery / Calendar / Feed), filter,
  sort, search, 10 property types.
- **Multi-workspace + sharing.** Per-workspace membership, role-based
  access, public share links with optional password, wiki mode.
- **Built-in collaboration.** Comments, @mentions, version snapshots,
  presence indicators (per-doc).
- **Import / export.** JSON round-trip preserves blocks + databases
  + sharing state. Markdown export per page.
- **MCP-ready.** First-class Notion-canonical JSON HTTP surface for
  AI tooling and integrations.

## Quick start (pick a lane)

### Lane 1 — Convex Cloud (fastest, free tier)

```bash
git clone https://github.com/rahmanef63/open-silong.git
cd open-silong
pnpm install
cp .env.example .env.local       # fill in NEXT_PUBLIC_CONVEX_URL after step 3
npx convex dev                   # creates a Convex Cloud project, prints URL
pnpm dev                         # open http://localhost:3000
```

Convex Cloud free tier covers small teams. Detailed steps in
[`DEPLOY.md`](./DEPLOY.md#lane-1--convex-cloud).

### Lane 2 — Self-hosted (Docker Compose, full control)

```bash
git clone https://github.com/rahmanef63/open-silong.git
cd open-silong
cp .env.example .env.local       # fill in INSTANCE_NAME / INSTANCE_SECRET / JWT_PRIVATE_KEY / JWKS / CONVEX_ADMIN_KEY / POSTGRES_URL
docker compose up -d             # spins Convex backend on port 3210
pnpm install
pnpm exec convex deploy --yes    # push schema + functions to your backend
pnpm dev                         # open http://localhost:3000
```

Full Dokploy + Traefik + Postgres + S3 setup in
[`DEPLOY.md`](./DEPLOY.md#lane-2--self-hosted-docker-compose).

### Lane 3 — Try it without installing anything

Open [silong.rahmanef.com](https://silong.rahmanef.com) — public demo
deploy. Sign up with email magic link, start writing.

> Looking for a **localStorage-only template** (no backend, no auth)?
> The same UI ships as `notion-page-clone-os` in the
> [rahmanef-resources-site](https://github.com/rahmanef63/resources)
> template marketplace: `npx rr add notion-page-clone-os`.

## Architecture (one screen)

```
app/                  Next 16 App Router routes
  dashboard/*         Authenticated surfaces (pages, databases, settings, …)
  share/[id]          Public read-only share surface
  preview/*           Marketing + sandbox

frontend/
  slices/<name>/      Vertical feature slices (editor, databases, comments,
                      mentions, snapshots, sharing, wiki, …)
  shared/             Cross-slice primitives, providers, store hooks
proxy.ts              Convex auth optimistic gate (not the security boundary)

convex/
  features/<name>/    Per-feature backend (schema + queries + mutations)
  _shared/            Auth helpers, rate limit, workspace gates
  http.ts             Public HTTP routes (share, MCP)
  mcp/                MCP HTTP surface (Notion-canonical JSON)

docker-compose.yml    Convex self-hosted (port 3210, Traefik-frontable)
```

Full slice index and per-feature docs live under [`docs/`](./docs/).
Architectural decisions and audit notes:
[`docs/audit/`](./docs/audit/). OSS readiness tracker:
[`docs/notion-clone/PUBLIC-READINESS.md`](./docs/notion-clone/PUBLIC-READINESS.md).

## Contributing

Bug reports, PRs, and feature ideas welcome. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md) for dev setup, slice
architecture, and PR conventions.

By participating, you agree to the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Found a vulnerability? Please **don't** open a public issue — see
[`SECURITY.md`](./SECURITY.md) for the responsible-disclosure
process.

## License

[MIT](./LICENSE). © 2026 Rahman Effendi and contributors.

`open-silong` is **not affiliated with, endorsed by, or associated
with Notion Labs, Inc.** "Notion" is a registered trademark of
Notion Labs. This project is independently developed and uses the
name only as a generic descriptor of its UI metaphor (block-based
editor + database). Any visual / interaction resemblance is
inspirational, not derivative.
