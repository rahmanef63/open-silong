# ESLint Baseline — 2026-05-12

Setup migrated to ESLint v9 flat config (`eslint.config.mjs`) because:
- Next.js 16 removed `next lint`
- ESLint v9 requires flat config; `.eslintrc.json` not loaded
- `eslint-config-next` via FlatCompat causes circular-structure JSON error

## Resolution

Direct `@next/eslint-plugin-next` + `typescript-eslint` + `eslint-plugin-react-hooks`. Bypasses the broken FlatCompat path.

## Baseline counts

| Check | Errors | Warnings |
|-------|--------|----------|
| Lint  | 0      | 238      |
| Typecheck (strict OFF) | 0 | 0 |
| Build | not yet run | — |

## Warning breakdown

- `@typescript-eslint/no-explicit-any` — pervasive (Convex generic types, store, hooks)
- `@typescript-eslint/no-unused-vars` — minor
- `react-hooks/exhaustive-deps` — design choice in editor effects
- `no-restricted-imports` (cross-slice) — 2 imports in `workspace-io/components/WorkspaceIODialog.tsx` reach into `slices/files/`

## Rules downgraded to `warn` (baseline tolerance — tighten in follow-up)

- `@typescript-eslint/no-empty-object-type` (shadcn primitives use empty interface aliasing)
- `@typescript-eslint/no-unused-expressions` (1 ternary in WorkspaceIODialog)
- `prefer-const` (2 cases)
- `no-restricted-imports` slice-isolation (cross-slice violations exist)

## Why `--max-warnings 9999`

Allow CI to pass while tracking warnings as tech debt. Future iterations:
- Fix top 50 warnings per PR
- Downgrade threshold as count drops (9999 → 200 → 50 → 0)

## TS strict status

`strict: false` in `tsconfig.json`. Enabling will introduce many errors — separate task in SSOT Phase 0.

## Follow-up tasks

- [ ] Run `next build` to confirm production build still works
- [ ] Enable TS strict + capture error count
- [ ] Audit cross-slice imports in `workspace-io`
- [ ] Tighten lint thresholds incrementally
