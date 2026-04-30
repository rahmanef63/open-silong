# Notion clone — process

Working agreement for moving items from `BACKLOG.md` to shipped.

---

## Kanban columns

| Column | Meaning |
| --- | --- |
| **Backlog** | Captured but not yet ready (no acceptance criteria, no estimate) |
| **Ready** | Acceptance criteria written, scope clear, unblocked |
| **In Progress** | Owned by one engineer, branch open |
| **Code Review** | PR opened, awaiting review / CI |
| **QA** | Merged to main, manual / E2E verification needed |
| **Blocked** | Cannot progress until external dependency resolved |
| **Done** | Shipped to production (deployed via si-coder), `[x]` propagated to BACKLOG + ROADMAP |
| **Deferred** | Intentionally pushed to a later phase; tracked in Scale / Enterprise |

---

## Recommended task properties

| Property | Values | Purpose |
| --- | --- | --- |
| Priority | P0 / P1 / P2 / P3 | Triage urgency |
| Module | Editor / Database / Auth / Workspace / Search / Infra / QA | Routing for review |
| Complexity | S / M / L / XL | Estimation; XL = must split |
| Risk | Low / Medium / High | Migration / data-loss / regression risk |
| Owner | Engineer / Designer / PM | Single accountability |
| Sprint | Sprint number | Time bucket |
| Status | Todo / In Progress / Review / Done | Mirrors Kanban |
| Dependency | Related task IDs | Block / blocked-by |
| Acceptance Criteria | Markdown checklist | Required before `Done` |

---

## Definition of Done

A task is shipped only if **every** box passes:

- [ ] UI matches design / spec
- [ ] API (Convex query/mutation) implemented and validated
- [ ] Permission check in place (`getAuthUserId` + `by_user` index)
- [ ] Loading state present
- [ ] Empty state present
- [ ] Error state present
- [ ] Unit / integration test exists (where applicable)
- [ ] No major console errors / warnings
- [ ] Mobile / responsive verified (or explicitly punted with reason)
- [ ] No measurable performance regression on the affected path
- [ ] Internal docs updated (BACKLOG checkbox flipped, ROADMAP updated, README current state if material)
- [ ] QA checklist passed manually
- [ ] Deployed via `si-coder/deploy.js` (never raw `npx convex deploy`)

---

## Foundational task order

Safest implementation order when starting from scratch (this codebase is past step 5):

1. **Data model** — workspace, page, block, database, property
2. **Auth + workspace**
3. **Page CRUD + sidebar**
4. **Block editor basic**
5. **Autosave + undo / redo**
6. **Database table + properties**
7. **Filter / sort**
8. **Media upload**
9. **Permissions**
10. **Search**
11. **Relations + formulas**
12. **Templates + task database**
13. **Offline / realtime**

The hardest surfaces are not UI: **block editor**, **database schema engine**, **formula engine**, **permission resolver**, **realtime sync**, and **performance for large pages / databases**. Schedule them with extra slack and pair-design before implementation.

---

## Update protocol

1. Pick an item from `BACKLOG.md` matching current sprint priority (`ROADMAP.md`).
2. Move to **In Progress**, branch off `main` named `feat/<area>-<slug>`.
3. Implement under `src/slices/<name>/` per `.claude/RULES.md`.
4. Open PR, run CI, deploy preview if available.
5. After merge + deploy, flip `[ ]` → `[x]` in BACKLOG (and ROADMAP if it's a phase target) in the same commit as the deploy trigger.
6. If a deviation from rules is necessary, log in `.claude/DEBT.md` with rationale.
