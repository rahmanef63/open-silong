# Public OSS readiness checklist — open-silong

Tracker for the pre-release tasks before flipping the GitHub repo from
private prod deploy to public open-source product. Updated as items
ship. Companion to:
- `docs/rr-sync/2026-05-20-pivot-nosion-source-of-truth.md` (strategic pivot)
- `docs/audit/2026-05-20-rr-bh-bi-bj-completion.md` (rr lift status)
- `docs/rr-sync/lift-status.md` (per-slice lift state)
- `docs/notion-clone/SMOKE-TEST.md` (golden flow)
- `CHANGELOG.md` (release history)

Status legend: `[ ]` todo · `[x]` done · `[~]` partial.

## P0 — must ship before public push

### Repo metadata
- [x] Pick LICENSE (MIT) + add `LICENSE` file at repo root (commit `4c560f2`)
- [x] Update `package.json` `"license"` field
- [x] Add repo description + topics on GitHub
  (`notion-clone, notion-alternative, workspace, block-editor, convex, nextjs, react, self-hosted, open-source, indonesia`)
- [x] Repo rename `notion-page-clone` → `open-silong` (rahmanef63 account)
- [x] Local git remote updated to SSH `git@github.com:rahmanef63/open-silong.git`

### Documentation
- [x] Rewrite `README.md` for OSS audience (3-lane quick start +
  architecture + Notion-Labs disclaimer, commit `4c560f2`)
- [x] `CONTRIBUTING.md` — dev setup, slice contract, PR flow
- [x] `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- [x] `.env.example` — annotated env vars for Convex cloud + self-hosted
- [x] `DEPLOY.md` — Lane 1/2/3 + backup + migration + troubleshooting
- [x] `SECURITY.md` — `security@rahmanef.com` disclosure + private advisory
- [x] `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config.yml}`
- [x] `.github/PULL_REQUEST_TEMPLATE.md`
- [x] Root `CHANGELOG.md` — release history (OSS polish wave)
- [x] `docs/notion-clone/SMOKE-TEST.md` — manual golden-flow checklist
- [ ] Screenshots/GIFs for README hero (needs browser session — defer
  until smoke test passes)

### Demo + onboarding
- [x] First-run demo seed: 3 welcome pages auto-seeded into new
  personal workspace (Phase 3, commit `1f012ad`, Convex deployed)
- [x] Opt-out env var `SILONG_DISABLE_SEED=1` documented
- [ ] First-run UX polish pass (smoke test will surface gaps)
- [ ] Public demo deploy at `silong.rahmanef.com` (Dokploy domain
  added — domain id `tRFJgMqVT0AtOblef_sVF` — pending user-side DNS A
  record at Hostinger: `silong` → `76.13.23.37`)

### Code-side polish
- [x] Sweep all `TODO` / `FIXME` / `XXX` — closed: snapshot retention
  TODO in `convex/_shared/limits.ts:84` implemented in `snapshots.ts`
  (commit `60a2433`); remaining matches are markdown parser regex +
  seed data labels, not action items
- [ ] Run `docs/notion-clone/SMOKE-TEST.md` end-to-end (golden flow)
- [ ] Mobile responsiveness pass (iPhone SE / Pixel 5 / iPad)
- [x] Error boundary review — `app/error.tsx` (route),
  `app/dashboard/error.tsx` + per-segment `error.tsx` (auth, share,
  admin), `app/global-error.tsx` (root layout fallback, NEW commit
  `60a2433`), `ErrorBoundary` + `ChunkErrorBoundary` wrap shell/db
  block. Coverage complete.
- [ ] Lighthouse pass — fix critical performance regressions

### Security hygiene
- [x] `.gitignore` hardened — explicit `.env` + `.env.*` rules with
  `!.env.example` negation
- [x] Verify no committed secrets (`git grep` for sk-/ghp_/AKIA + git
  history for `.env` files — clean)
- [x] `SECURITY.md` disclosure email set

### Distribution
- [x] rr-side update: `notion-page-clone-os` template card points to
  open-silong repo as production stack (rr commit `313777b`)
- [x] rr-side update: `notion-shell` agentRecipe adds product-pointer
  block
- [x] rr-sync round 1: theme-presets lifted to rr + `notion-like` tag
  on 5 catalog entries (rr commit `193f9f0`, this repo commit `abb17f6`)
- [ ] `npx rr notion-clone` CLI verb that git-clones open-silong
  (separate rr CLI dev work, defer)
- [ ] rr-sync CI auto-check on commits to `frontend/slices/editor/` or
  `frontend/slices/databases/` (defer — manual sync per release)

## P1 — strongly recommended (post-launch ok)

- [ ] GitHub Actions: typecheck + test on PR (cost trade-off —
  rahmanef63 off Actions cloud; workflow_dispatch-only or self-hosted
  runner)
- [ ] Docs site (Mintlify / Fumadocs / docusaurus) at
  `docs.silong.rahmanef.com`
- [ ] Public roadmap (README section or GitHub Projects board)
- [ ] Recorded demo video (Loom / YouTube)
- [ ] Featured on awesome-notion-alternatives / awesome-self-hosted
- [ ] rr-sync adapter wave — lift 11 blocked-pending-adapter slices
  with storage-adapter pattern (per `docs/rr-sync/lift-status.md`)
- [ ] GitHub Discussions enabled
- [ ] GitHub Sponsors / OpenCollective set up

## P2 — nice to have

- [ ] i18n scaffold + 2-3 languages
- [ ] Plugin / extension API design (so rr-style slices can be added
  without forking)
- [ ] Per-workspace accent themes (theme-presets slice covers tweakcn
  presets already)
- [ ] Email digest cron (already partially in `convex/maintenance.ts`)
- [ ] Migration tools from Notion export / Obsidian vault / Markdown
  folder
- [ ] Coordinated re-key wave:
  - `INSTANCE_NAME=notion-page-clone` → `open-silong`
  - Convex backend domain `api-notion-page-clone.rahmanef.com` →
    `api-silong.rahmanef.com`
  - MCP server name + tool prefixes (`@nosion/mcp-server` →
    `@open-silong/mcp-server`, `nosion-*` tools → `silong-*`)
  - localStorage keys (`nosion:iconRecents` →
    `silong:iconRecents`, …) with migration shim
  - Webhook header `X-Nosion-Signature` → `X-Silong-Signature` (with
    alias for old)
  - Code identifiers `NosionCommandPalette` → `SilongCommandPalette`
    + `nosion://sync/` URL scheme

## Status snapshot (2026-05-21)

P0 progress: **19/24** items done = **79%**. Remaining:
- 1 docs (screenshots — needs browser session)
- 1 onboarding (public demo DNS, user-side)
- 3 code-side polish (smoke test + mobile + Lighthouse — manual UI work)

After P0 closes, flip repo visibility:
```bash
gh repo edit rahmanef63/open-silong \
  --visibility public \
  --accept-visibility-change-consequences
```

Then announce via Twitter/HN/Reddit/Indo-dev community channels.

## Tracking

This file lives at `docs/notion-clone/PUBLIC-READINESS.md`. Updates
land with the relevant code/docs commit. When P0 is fully `[x]`,
flip the GitHub repo from private to public and announce.

## Related docs

- `docs/rr-sync/2026-05-20-pivot-nosion-source-of-truth.md` — strategic pivot record
- `docs/audit/2026-05-20-rr-bh-bi-bj-completion.md` — rr lift status (BH/BI/BJ)
- `docs/rr-sync/lift-status.md` — per-slice lift state (BS round 1)
- `docs/notion-clone/SMOKE-TEST.md` — golden flow checklist
- `docs/notion-clone/ROADMAP.md` — feature roadmap (pre-OSS)
- `docs/notion-clone/SPRINT.md` — current sprint plan
- `CHANGELOG.md` — release history
