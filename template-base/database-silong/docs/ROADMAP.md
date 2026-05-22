# Roadmap — database-silong

Honest plan. No ETAs unless committed. Anything past v0.5 is **community-driven** — bumps land when the upstream open-silong project ships them OR a contributor lands a PR.

> Upstream lives at <https://github.com/rahmanef63/open-silong>. This template is sliced out of `frontend/slices/notion/` + `convex/features/databases/` on every release.

---

## Current — v0.5 (shipped)

The drop-in is feature-complete for single-database and multi-database use cases that don't need cross-DB lookups.

### Views — 11

| View | Notes |
|---|---|
| `table` | Default. All cell types renderable inline. |
| `board` | Group-by single_select / status. Drag between columns. |
| `list` | Compact single-property stack. |
| `gallery` | Card grid, configurable cover property. |
| `calendar` | Month grid keyed on a date property. |
| `feed` | Activity-stream layout. |
| `chart` | Bar / line / pie from numeric properties. |
| `dashboard` | KPI tiles + chart composition. |
| `form` | Public submit-to-create (Convex mode). |
| `map` | Lat/lng property → marker plot. |
| `timeline` | Gantt-style date-range view. |

### Cell types — 16

`text` · `number` · `checkbox` · `select` · `multi_select` · `status` · `date` · `url` · `email` · `phone` · `files` · `person` · `formula` · `created_time` · `last_edited_time` · `unique_id`

### Other shipped capabilities

| Capability | Status |
|---|---|
| FilterBuilder (per-property predicates, AND/OR groups) | ✅ |
| SortBuilder (multi-level, asc/desc) | ✅ |
| Formula engine (`={{prop}} + 1`, string/date/number ops) | ✅ |
| Public form views (anonymous submit → page row) | ✅ |
| Dual-mode Convex backend (minimal single-user / full multi-workspace) | ✅ |
| Drop-in `app/db/[[...slug]]/page.tsx` catch-all route | ✅ |
| `useLocalStorageNotionAdapter()` for zero-infra demos | ✅ |
| Docs (INSTALL · WIRING · PROMPT · SCHEMA · CONVEX-BACKEND · TROUBLESHOOT · this file) | ✅ 7 |

---

## v0.6 — planned, no ETA (community-driven)

| Item | Effort | Depends on | Notes |
|---|---|---|---|
| Relation property (cross-DB lookup) | ~2–3 days | New cross-DB query infrastructure in the adapter | Schema slot exists, UI/runtime missing. See `docs/audit/2026-05-12-database-route-refactor.md` in open-silong for design context. |
| Rollup property (aggregate over relation) | ~1–2 days | Relation shipped first | `count`, `sum`, `avg`, `min`, `max`, `unique`, `show_original`. |

Tracker: file an issue at upstream when starting work so two contributors don't duplicate effort.

---

## v0.7 — stretch (likely needs upstream coordination)

| Item | Effort | Notes |
|---|---|---|
| `npx rr add notion-database --with-backend` flag | ~1 day on rr CLI side | Currently `convex/handlers/` + `convex/schema.database-silong.ts` are copied manually. Needs an rr subcommand that knows about backend templates. |
| Snapshots adapter wired by default | ~0.5 day | Adapter contract already abstracts `snapshots.*` — just needs default UI hookup + Convex-mode plumbing. |
| Presence adapter ("currently viewing" badges) | ~1 day | Same shape as snapshots — adapter slot present, no default UI. |
| AI adapter on by default | ~0.5 day | Currently opt-in via `config.features.ai`. |

---

## Out of scope — won't ship

These are intentional non-goals. Use a sibling slice / external service.

| Want | Use instead |
|---|---|
| Real-time collaborative cursor positions | [Liveblocks](https://liveblocks.io) / [Yjs](https://yjs.dev) adapter on top |
| Built-in payments / paywalls | Stripe slice (separate) |
| Built-in chat / messaging | `ai-chat` slice (separate) |
| Mobile-native (iOS/Android) apps | Web-first project; wrap in Capacitor if you need a shell |
| Email-sending workflows | Resend / SendGrid in your own actions |

---

## How versions are decided

Semver-ish:

- **patch** (v0.5.x) — bugfix only, no schema change, no adapter contract change
- **minor** (v0.6.0) — new feature, additive schema, additive adapter methods (existing code keeps working)
- **major** (v1.0.0) — breaking schema or breaking adapter contract → migration doc shipped

See [`UPDATE-FROM-UPSTREAM.md`](./UPDATE-FROM-UPSTREAM.md) for how to pull updates safely.
