# Active sprint plan — offline / formula / relation

Reorder of the three buckets the user prioritised, sequenced by dependency
density (smallest LOC + foundation for the next bucket goes first).

> Status legend: `[x]` shipped · `[~]` in progress · `[ ]` queued · `[d]` deferred.
> Each item links back to BACKLOG.md for context.

---

## Sprint 1 — Relations & Rollups polish

**Scope:** finish §18 BACKLOG. Pure DB-correctness work; small LOC; foundation
for Sprint 2 (formula's list-ops reach into rollups).

| # | Item | BACKLOG | LOC est. | Notes |
| - | --- | --- | -: | --- |
| S1.1 | Missing rollup aggregates: avg / min / max / earliest / percent_checked / count_unique | 18.2 | 50 | ROADMAP already claims these — implementing for real |
| S1.2 | Rollup error state if relation/target prop deleted | 18.2 | 20 | Inline placeholder in `RollupCell` |
| S1.3 | Relation: "Database removed" if `relationDatabaseId` orphaned | 18.1 | 15 | Inline warning in `RelationCell` |
| S1.4 | Relation: "+ Create new related row" inside picker | 18.1 | 30 | Inline button → `addRow(targetDb)` + auto-link |
| S1.5 | Relation: handle target row deleted | 18.1 | already filtered in render — confirm + add `[stale]` chip if id resolves to null |
| S1.6 | Two-way relation (auto inverse) | 18.1 | 120 | Toggle in config; mirror on add/remove via client-side wrapper |
| S1.7 | Rollup loop guard (relation cycle) | 18.2 | 40 | Visited-set on traversal |
| S1.8 | Rollup: show original values mode | 18.2 | 10 | Already partially present as `values` aggregate — relabel + unique handling |

**Ship target:** S1.1 + S1.2 + S1.3 + S1.4 + S1.5 this session.
S1.6 + S1.7 promoted to Sprint 1.5 (next session) since they need cross-row
mutation coordination.

---

## Sprint 2 — Formula engine ✅ shipped 2026-05-02

**Scope:** finish §17 BACKLOG. Sprint 2 depends on stable rollups (list ops
over rollup outputs).

| # | Item | BACKLOG | Status |
| - | --- | --- | --- |
| S2.1 | Typed eval (number / string / boolean / date / null / list) | 17.1 | ✅ `FormulaValue` |
| S2.2 | Dependency graph (per-formula referenced prop ids) | 17.1 | ✅ `collectDeps()` |
| S2.3 | Circular-dependency guard | 17.1 | ✅ visited set keyed `rowId:propId` |
| S2.4 | Result cache (per row + prop) | 17.1 | ✅ `Map<key, FormulaValue>` |
| S2.5 | `substring(s, start, len)` | 17.2 | ✅ |
| S2.6 | Date: `dateAdd` / `dateSubtract` / `dateBetween` / `formatDate` | 17.2 | ✅ |
| S2.7 | List: `count` / `sum` / `join` | 17.2 | ✅ (map/filter need lambdas — deferred) |
| S2.8 | Error position highlight in editor | 17.3 | ✅ click-to-jump banner |
| S2.9 | Property / function autocomplete | 17.3 | ⏸ deferred (UI-heavy) |

Engine lives at `src/slices/databases/lib/formulaEngine.ts` (recursive-descent
parser → AST → typed eval). 21 unit tests cover template/math/call/date/list/
circular/error-position cases.

---

## Sprint 3 — Offline

**Scope:** finish §11 BACKLOG. Heavy infra; touches Convex client wrapping
+ build config (vite-plugin-pwa) + IDB schema. Multi-session.

| # | Item | BACKLOG | LOC est. | Notes |
| - | --- | --- | -: | --- |
| S3.1 | PWA install (vite-plugin-pwa) — static shell offline | 11.1 | 30 + config | Service worker + manifest |
| S3.2 | Online/offline indicator (badge + banner) | 11.1 | 40 | `navigator.onLine` + Convex connection state |
| S3.3 | IndexedDB mirror of `pages` + `databases` query results | 11.1 / 11.3 | 200 | `idb` lib; write-through on every successful fetch |
| S3.4 | Cold-load hydration from IDB when offline | 11.1 | 60 | Wrap `useStore` to seed from IDB before Convex resolves |
| S3.5 | Last-synced timestamp per cache slice | 11.1 | 20 | Store `syncedAt` alongside payload |
| S3.6 | Block writes when offline + banner | 11.1 / 11.2 | 80 | Wrap mutation hooks; toast "queued — will sync" |
| S3.7 | Mutation queue persistence in IDB | 11.2 | 150 | Append-only log; replayable across reload |
| S3.8 | Replay queue on reconnect (last-write-wins) | 11.2 | 100 | Drain queue serially; mark each row `synced` on ack |
| S3.9 | Per-page offline pinning (📌 toggle in sidebar) | 11.3 | 40 | Pinned pages prefetched + kept across cache eviction |
| S3.10 | Cache size limit + clear-offline-data setting | 11.3 | 50 | LRU eviction over 50 MB default |

---

## Ordering rationale

1. **S1 first** — smallest, fixes user-visible correctness bugs (rollup wrong,
   relation orphans), and gives Sprint 2's list-ops a stable substrate.
2. **S2 second** — formula type system needs stable inputs (rollups). List
   ops in S2.7 read rollup outputs; doing them before S1 means double work.
3. **S3 last** — heaviest. Service-worker + IDB schema design changes are
   irreversible-ish and should land on a code-frozen schema. Sprint 1 + 2
   stabilise the schema (no more `rollupAggregate` enum churn or formula
   token format changes), so S3 can mirror without re-migrations.

---

## Tracking

- BACKLOG entries get ticked as each S-item lands.
- ROADMAP V1 line "Offline read" stays `[ ]` until S3.4 lands.
- ROADMAP V2 line "Offline write" stays `[ ]` until S3.8 lands.
- This file updates per ship cycle (mark `[x]` and date).
