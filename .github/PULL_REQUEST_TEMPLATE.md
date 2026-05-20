<!-- Thank you for the contribution! -->

## What does this PR do?

<!-- One-paragraph summary. If it's a bugfix, link the issue:
"Fixes #123". -->

## Why?

<!-- The user need / motivation. Skip if obvious from the issue. -->

## How was this tested?

- [ ] `pnpm typecheck` green
- [ ] `pnpm test` green (affected suites)
- [ ] Manually walked the golden flow in the browser

<!-- If UI: include a screenshot or short GIF (before / after). -->

## Breaking changes?

- [ ] No
- [ ] Yes (describe migration path below)

<!-- Schema migrations: link the migration script under
convex/migrations/. Prop renames: note the deprecation path. -->

## Docs touched?

- [ ] No
- [ ] Yes (which files)

## Checklist

- [ ] Conventional commit prefix (feat / fix / docs / chore / refactor / test)
- [ ] No secrets / `.env` files staged
- [ ] No `console.log` left behind (use `frontend/shared/lib/error.ts`)
- [ ] Mobile responsive (if UI)
- [ ] shadcn primitives + theme tokens only (if UI)
- [ ] Authz inside Convex handlers (if backend) — `requireOwned` /
      `requireWorkspaceMember`
- [ ] Indexes declared (if `.filter` / `.order` on a new table)
