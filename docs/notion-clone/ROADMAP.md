# Notion clone — release roadmap

Promotes items from `BACKLOG.md` into release phases. Mark `[x]` once a phase target is materially shipped (best-effort, not 100% line-for-line).

> Live deployments: frontend `https://nosion.rahmanef.com`, Convex `https://api-notion-page-clone.rahmanef.com`.

---

## MVP — usable for notes + simple database

Status: **shipped (single-user)**.

- [x] Auth (Convex Auth — email + password)
- [x] Workspace
- [x] Sidebar (favorites / recent / private / shared / trash)
- [x] Page CRUD
- [x] Block editor basic
- [x] Paragraph / heading / list / checklist / quote / divider
- [x] Rich-text formatting (bold / italic / underline / strikethrough / inline code / link / mentions)
- [x] Slash command
- [x] Drag reorder blocks
- [x] Basic media (image upload + file)
- [x] Database table
- [x] Basic properties (title / text / number / select / multi-select / status / date / person / checkbox / url / email / phone / files)
- [x] Filter / sort
- [x] Soft delete + restore
- [x] Search (in-memory client-side)
- [x] Permissions basic (single-user owner gating)

---

## V1 — Notion-like for personal / team

Status: **mostly shipped**, gaps below.

- [x] Board / list / calendar / gallery views (Timeline shipped too)
- [x] Relations
- [x] Rollups (count / sum / avg / min / max / earliest / latest / percent-checked)
- [x] Formulas basic (substitution + arithmetic + 18 functions: if/and/or/not/empty/concat/contains/replace/lower/upper/length/round/floor/ceil/abs/min/max/now/today)
- [x] Templates (per-database, default flag, body block seed via H2/H3/bullet/todo shortcuts)
- [x] Backlinks panel
- [x] Comments (page + block, resolve, edit)
- [x] Public sharing (`/share/:id`)
- [ ] Duplicate public page (login-walled clone)
- [x] Code blocks with syntax highlight (highlight.js, 30+ langs, copy button)
- [x] Math equations (KaTeX block math, click-to-edit, error state)
- [x] Keyboard shortcuts (in-editor + global ⌘K palette)
- [x] Task database preset (Tasks/Sprints/Projects via ⌘K with seeded schema + views + templates)
- [ ] Sprints basic — link/start/complete/burndown still missing
- [ ] Offline read

---

## V2 — Advanced productivity

Status: **not started**, items live in BACKLOG.

- [ ] Synced blocks
- [ ] Offline write (mutation queue + reconcile)
- [ ] Wiki + verified pages
- [ ] Sub-items
- [ ] Dependencies
- [ ] Timeline drag-to-adjust + dependency lines
- [ ] Presentation mode
- [ ] Linked database / data sources
- [ ] Formula advanced functions (date / list / logic)
- [ ] Import / export (Markdown / HTML / CSV / ZIP)
- [ ] Activity log
- [ ] Advanced permissions (per-page overrides, guest access)

---

## Scale / Enterprise

Status: **deferred**.

- [ ] CRDT realtime collaboration (Yjs / Automerge)
- [ ] Large-database optimization (virtualization, cursor pagination)
- [ ] Audit log
- [ ] SSO / SAML
- [ ] SCIM
- [ ] Data retention policies
- [ ] Admin analytics dashboard
- [ ] Public API integrations
- [ ] Webhooks
- [ ] External synced databases

---

## Working principles for promotion

- Each item promoted out of BACKLOG into a release phase MUST have a PR-sized scope. Bigger items split into sub-phases.
- Every promoted item passes `PROCESS.md` Definition of Done before `[x]`.
- Phase rollovers update both `BACKLOG.md` (mark `[x]`) and this file (mark `[x]`) in the same commit.
