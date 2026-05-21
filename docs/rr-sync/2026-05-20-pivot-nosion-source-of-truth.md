# Pivot — nosion = open-source source-of-truth (2026-05-20)

## Decision

**nosion** (this repo, deployed at https://nosion.rahmanef.com) becomes
the canonical open-source product for the Notion-clone OS. The
`rahmanef-resources-site` (rr) monorepo keeps the `notion-page-clone-os`
template + `notion-shell` slice as **demo + pointer surfaces**, not as
the primary distribution channel.

Rationale:
- rr monorepo has 40+ slices, hard for outside contributors to navigate.
- nosion is focused (1 product), easy clone-and-run.
- rr's notion-page-clone-os template is a localStorage demo (no
  Convex / auth / multi-user) — useful as a discovery card, not as a
  production stack.
- Sync direction stays unchanged: nosion → rr (lift-only via
  `rr-sync/` scripts already present in this repo).

## Two-surface model

| Surface | Audience | Stack | Entry point |
|---|---|---|---|
| **nosion** (this repo) | Self-hosters, OSS contributors | Next 16 + React 19 + Convex (cloud or self-hosted) + auth | `git clone github.com/rahmanef63/open-silong` + Convex setup |
| **rr template `notion-page-clone-os`** | Template-browser users, devs evaluating | Next 16 + React 19 + localStorage (`createTemplateStore`) | `npx rr add notion-page-clone-os` (demo) — surfaced card links to nosion repo for production |
| **`notion-shell` rr slice** | Devs embedding Notion-style UI into other projects | Next 16 + React 19 + props-driven | `npx rr add notion-shell` (lifts wrappers + helpers) |

## Sync flow

```
                  ┌──────────────┐
                  │   nosion     │   ← source of truth (this repo)
                  │  (Convex)    │
                  └──────┬───────┘
                         │  rr-sync (lift script)
                         ▼
              ┌──────────────────────┐
              │  rr monorepo         │
              │  ─────────────────   │
              │  notion-shell slice  │  ← portable wrappers
              │  template            │  ← localStorage demo
              │  notion-blocks slice │  ← equation / code / notify / grid
              │  icon-picker slice   │
              └──────────────────────┘
```

- One-way push: changes land in nosion first, then `rr-sync` script
  copies the cleaned-up portable subset into rr.
- rr **never** modifies the source; if a fix is needed in a lifted
  file, it must originate in nosion and re-sync.

## `npx rr notion-clone` redirect (planned)

When a user runs `npx rr notion-clone`, instead of installing the
localStorage template, the CLI should:

1. Detect the intent (full Notion clone, not template demo).
2. Suggest `git clone https://github.com/rahmanef63/open-silong`
   + Convex setup instructions.
3. Optionally `degit` clone directly.

The existing `npx rr add notion-page-clone-os` keeps working — it's
the **template-install** path, not the **product-bootstrap** path.

## License (TBD)

Both repos move to OSS license (MIT recommended, pending user
decision). Currently undeclared.

## OSS readiness backlog

Tracked in `docs/notion-clone/PUBLIC-READINESS.md` — created in the
same session as this pivot note.

## State at pivot

- nosion: feature-complete per `docs/notion-clone/ROADMAP.md` cycle 7+
  (multi-workspace, comments, mentions, snapshots, wiki, sharing,
  import/export, MCP, AI-agent).
- rr `notion-shell`: v0.4.0 (slash menu + decorator + actions menu +
  6 views + 10 property cells + drag + cover + image/embed renderers
  + page actions menu) — see
  `docs/audit/2026-05-20-rr-bh-bi-bj-completion.md`.
- rr `notion-page-clone-os` template: drop-in usable as localStorage
  demo with the full notion-shell wrappers wired.

## Follow-up

User to confirm:
1. github repo rename (`notion-page-clone` → `nosion`)?
2. License pick (MIT / Apache / AGPL)?
3. rr template surface — keep demo + pointer / slim to pointer-only /
   delete?
4. `npx rr notion-clone` behavior — clone repo / install template /
   both (different verbs)?
5. P0 OSS readiness scope (full checklist vs minimal)?
6. Demo seed strategy (onboarding wizard / pre-seeded acme /
   empty-with-tooltips)?
7. rr-sync CI enforcement (auto-trigger on nosion commit / manual
   per-release / defer)?
