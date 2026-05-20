# Contributing to open-silong

Thanks for considering a contribution — bug reports, feature ideas,
docs fixes, and code PRs are all welcome.

## Quick links

- **Got a bug?** Open an issue with the bug template — small repro
  helps most.
- **Want to discuss before coding?** Open a GitHub Discussion (or
  issue with the feature template).
- **Tiny doc fix?** Just open a PR.

## Dev setup

### Prerequisites

- Node 20+ (LTS)
- pnpm 10 (the repo pins `packageManager: pnpm@10.32.1`)
- Docker + Docker Compose (for self-hosted Convex lane)
- A Convex Cloud account (for the cloud lane)

### Local install

```bash
git clone https://github.com/rahmanef63/open-silong.git
cd open-silong
pnpm install
cp .env.example .env.local
# Pick your Convex lane — see DEPLOY.md
pnpm dev
```

Hot-reload Next at `http://localhost:3000`. Convex dev backend
streams logs in the terminal you ran `npx convex dev` in.

### Useful scripts

```bash
pnpm dev               # Next dev server (port 3000)
pnpm typecheck         # tsc --noEmit (must be green before commit)
pnpm test              # vitest run
pnpm lint              # eslint
pnpm convex:dev        # Convex dev backend (cloud lane)
pnpm convex:deploy     # push functions to your Convex backend
```

## Codebase tour

Read [`CLAUDE.md`](./CLAUDE.md) — it's the same file we hand to AI
agents working in this repo, so it's the most current architectural
brief. Then:

- `app/` — Next 16 App Router routes. Dashboard lives under
  `/dashboard/*`.
- `frontend/slices/<name>/` — vertical feature slices (editor,
  databases, comments, …). Each slice exports through `index.ts`
  and is consumed directly by routes.
- `frontend/shared/` — cross-slice primitives (UI, store hooks,
  routes, providers).
- `convex/` — backend (queries/mutations/actions/schema/auth).
- `docs/` — per-feature docs, architecture notes, audit logs.

### Slice contract

A slice is a self-contained feature folder. Cross-slice imports go
**through the barrel only** (`@/features/<slice>`, not deep imports
into another slice's internals). Backend code lives in
`convex/features/<slice>/`.

When adding a new feature:

1. Decide if it's a slice or a primitive (single component →
   `frontend/shared/components/`; multi-file feature → slice).
2. Scaffold `frontend/slices/<name>/` with `components/`, `hooks/`,
   `lib/`, `types.ts`, `index.ts`.
3. If it needs backend, add `convex/features/<name>/` with `_schema.ts`,
   `queries.ts`, `mutations.ts`.
4. Add a doc page at `docs/api/<name>.md`.

## Conventions

### Commits

Conventional commits, scope optional:

```
feat(editor): add tag autocomplete in inline mentions
fix(databases): preserve sort when adding a row
docs(deploy): clarify self-hosted POSTGRES_URL format
chore(deps): bump convex to 1.37
```

### Code style

- TypeScript strict mode (no `any` without justification).
- Tailwind v4 + theme tokens only — no hex literals.
- shadcn primitives only — never raw `<button>` / `<dialog>` /
  `<input type=date>`.
- Convex public functions declare `args: { v.* }` validators.
- `defineTable(...).index(...)` for every `.filter` / `.order` path.
- No bare `.collect()` — use `.withIndex(...).take(N)` or paginate.
- File size cap: ~200 LOC per file (the rr lift pipeline enforces;
  internal-only files may exceed but consider splitting).

### Authz

Every public Convex mutation/query performs authz **inside the
handler** — use `requireOwned` / `requireWorkspaceMember` from
`convex/_shared/`. Route gates are convenience, not the boundary.

### PR flow

1. Fork → branch (`feat/...`, `fix/...`, `docs/...`).
2. Commits with conventional prefixes.
3. `pnpm typecheck` + relevant `pnpm test` green before push.
4. Open PR against `main`. The PR template prompts for context,
   screenshots (UI), and breaking-change callouts.
5. CI runs typecheck + lint + tests. We aim to triage within a week.

### Breaking changes

Backend schema migrations require a migration script under
`convex/migrations/` and a callout in the PR description. Frontend
prop renames need a deprecation note in the changelog.

## Reporting bugs

Use the [bug report template](./.github/ISSUE_TEMPLATE/bug_report.md).
Include:

- Lane (Convex cloud / self-hosted / public demo)
- Browser + OS
- Console errors / Convex logs (`pnpm exec convex logs --tail`)
- A minimal repro if possible

## Feature requests

Use the [feature request template](./.github/ISSUE_TEMPLATE/feature_request.md).
Describe the user need before the proposed implementation — we'd
rather discuss the "why" first.

## Security disclosures

See [`SECURITY.md`](./SECURITY.md) — don't open public issues for
vulnerabilities.

## Code of Conduct

Participation in this project is governed by the
[Contributor Covenant 2.1](./CODE_OF_CONDUCT.md). Report unacceptable
behaviour to the email in `SECURITY.md`.

## License

By contributing, you agree that your contributions will be licensed
under the project's [MIT License](./LICENSE).
