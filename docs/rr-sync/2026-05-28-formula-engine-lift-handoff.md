# Formula engine → `rahman-shared` lift handoff — 2026-05-28

> Forward plan, not retrospective. Written so any agent (Claude / rr's
> agent / human) can execute the publish cold. The in-repo prep is done;
> what remains needs the external `rahman-shared` repo.

**Goal**: publish `frontend/slices/databases/lib/formulaEngine/` as
`rahman-shared/formulaEngine` (FORMULA-ENGINE-API.md §7, "1.G.2 step A"),
then wire it server-side in Convex. The engine is genericized and
**CI-proven zero-dependency**, so the lift is a verbatim copy.

Pair with:
- `docs/FORMULA-ENGINE-API.md` — the SemVer API contract (§1 surface, §6
  bump rules, §7 publish strategy, §8 open items).
- `scripts/stage-formula-engine-lift.mjs` — deterministic payload assembler.
- `frontend/slices/databases/lib/convexHost.ts` — the second consumer
  (Convex-shape host); moves into `convex/` post-publish.

---

## What's already locked (in this repo, on `main`)

| Guard | File | Proves |
|---|---|---|
| Zero-dep / runtime-safe gate | `lib/formulaEngine/__boundary__.test.ts` | every engine file imports relative-only → no domain alias, no npm dep, no Node built-in. Liftable + Convex/edge-safe. |
| SemVer export tripwire | `lib/formulaEngine/__surface__.test.ts` | the 23 runtime value exports are frozen; an accidental rename/removal fails CI before it ships. |
| Tree-shaking audit | doc §8 #2 | `REGISTRY`/`SIGNATURES` are side-effect-free const spreads ⇒ `"sideEffects": false` is safe. |

Run `node scripts/stage-formula-engine-lift.mjs` for the live file list
(21 production files) + the exact `package.json` patch.

## Publish steps (external — needs `rahman-shared` write access)

1. **Copy payload**: `node scripts/stage-formula-engine-lift.mjs --to ../rahman-shared/src/formulaEngine`.
2. **rahman-shared**: apply the printed `package.json` patch (bump
   `0.2.0 → 0.3.0`, add `./formulaEngine` subpath export, `sideEffects:false`),
   commit, publish.
3. **open-silong**: `pnpm update rahman-shared`; swap the barrel
   `lib/formulaEngine.ts` from `./formulaEngine/index` → `rahman-shared/formulaEngine`.
   `silongHost` (in `lib/formula.ts`) stays consumer-side, unchanged.
4. **Wire Convex**: move `lib/convexHost.ts` → `convex/features/formulas/host.ts`,
   swap its engine import to `rahman-shared/formulaEngine`, `convex deploy`.
5. **Test parity** (§8 #4): bring the engine `*.test.ts` (incl. both gates,
   fixing their hardcoded `ENGINE_DIR` path) into rahman-shared CI; keep a
   thin proxy test here. Delete local `lib/formulaEngine/` after one release.

## The one residual risk (§8 #3)

Engine *code* is runtime-safe (gate above). The only unverified bit is
whether **Convex deploy resolves a `.ts` subpath export** — Convex usually
wants `.js`. Validated empirically at step 4: if deploy chokes on the
`.ts` entry, add a `.js` build for that subpath only (engine has zero deps,
so a single esbuild pass suffices). This cannot be tested without the
published package, so it is the first thing to check after step 2.
