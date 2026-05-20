# Public OSS readiness checklist — nosion

Tracker for the pre-release tasks before nosion (this repo) flips from
"private prod deploy" to "public open-source product." Created as part
of the 2026-05-20 pivot — see
`docs/rr-sync/2026-05-20-pivot-nosion-source-of-truth.md` for context.

Status legend: `[ ]` todo · `[x]` done · `[~]` partial.

## P0 — must ship before public push

### Repo metadata
- [ ] Pick LICENSE (MIT recommended) + add `LICENSE` file at repo root
- [ ] Update `package.json` `"license"` field
- [ ] Add repo description + topics on GitHub
  (notion, notes, react, convex, nextjs, open-source, self-hosted)
- [ ] Decide repo rename: `notion-page-clone` → `nosion`?
  (Keep old name as redirect via GitHub rename UI.)

### Documentation
- [ ] Rewrite `README.md` for OSS audience:
  - hero pitch (what + who for)
  - feature list w/ screenshots/GIFs (page editor, database, sharing)
  - 3-lane quick start (Convex cloud / self-hosted Docker / minimal localStorage demo)
  - tech stack callout (Next 16, React 19, Convex 1.36, Tailwind v4, shadcn)
  - link to docs/ subtree
  - contributing CTA
- [ ] `CONTRIBUTING.md` — dev setup, slice architecture, PR flow, conventional commits, where to file issues
- [ ] `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- [ ] `.env.example` — annotated env vars for Convex cloud + self-hosted lanes
- [ ] `DEPLOY.md` — Vercel + Convex cloud lane / Dokploy + self-hosted Convex Docker lane / "I just want to try it" lane
- [ ] `SECURITY.md` — vuln disclosure email + scope
- [ ] `.github/ISSUE_TEMPLATE/bug_report.md` + `feature_request.md`
- [ ] `.github/PULL_REQUEST_TEMPLATE.md`

### Demo + onboarding
- [ ] Decide demo seed strategy (see pivot doc Q6):
  - A) Onboarding wizard on first run
  - B) Pre-seeded `acme` workspace (recommended)
  - C) Empty + tooltip-driven
- [ ] First-run UX polish (the moment a fresh user sees the dashboard)
- [ ] Public demo deploy decision (read-only sandbox at demo.nosion.rahmanef.com?)

### Code-side polish
- [ ] Sweep all `TODO` / `FIXME` / `XXX` — close or backlog
- [ ] Smoke-test golden flows on a fresh DB: sign-up → workspace → page → block → DB → row → share → import/export
- [ ] Mobile responsiveness pass (iPhone SE / Pixel 5 / iPad)
- [ ] Error boundary review — make sure `frontend/shared/lib/error.ts` reaches every async surface
- [ ] Lighthouse pass — fix critical performance regressions

### Distribution
- [ ] rr-side update: `notion-page-clone-os` template card on rr
  catalog links to nosion repo as the "production stack" pointer.
- [ ] rr-side update: `npx rr notion-clone` CLI verb that
  git-clones nosion (vs `npx rr add notion-page-clone-os` for the
  localStorage template). Decide via pivot doc Q4.
- [ ] rr-sync CI check: warn when nosion commits to
  `frontend/slices/editor/` or `frontend/slices/databases/` without a
  rr lift follow-up. Decide via pivot doc Q7.

## P1 — strongly recommended (post-launch ok)

- [ ] GitHub Actions: typecheck + test on PR (cost trade-off — currently
  rahmanef63 is off Actions cloud; may need workflow_dispatch only
  pattern or self-hosted runner)
- [ ] Docs site (Mintlify / Fumadocs / docusaurus) at docs.nosion.rahmanef.com
- [ ] Public roadmap (README section or GitHub Projects)
- [ ] CHANGELOG.md (or use GitHub Releases)
- [ ] Recorded demo video (Loom / YouTube)
- [ ] Featured on awesome-notion-alternatives / awesome-self-hosted

## P2 — nice to have

- [ ] i18n scaffold + 2-3 languages
- [ ] Plugin / extension API design (so rr-style slices can be added without forking)
- [ ] Themes (light / dark already; add per-workspace accent)
- [ ] Email digest cron (already partially in `convex/maintenance.ts`)
- [ ] Sponsorship setup (GitHub Sponsors / OpenCollective)
- [ ] Discussion forum (GitHub Discussions enabled)
- [ ] Migration tools from Notion export / Obsidian vault / Markdown folder

## Tracking

This file lives at `docs/notion-clone/PUBLIC-READINESS.md`. Updates
land with the relevant code/docs commit. When P0 is fully `[x]`,
flip the GitHub repo from private to public and announce.

## Related docs

- `docs/rr-sync/2026-05-20-pivot-nosion-source-of-truth.md` — strategic pivot record
- `docs/audit/2026-05-20-rr-bh-bi-bj-completion.md` — rr lift status
- `docs/notion-clone/ROADMAP.md` — feature roadmap (pre-OSS)
- `docs/notion-clone/SPRINT.md` — current sprint plan
