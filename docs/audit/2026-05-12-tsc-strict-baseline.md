# TS Strict Mode — Baseline Audit (2026-05-12)

## Why this matters

SSOT migration target standard demands `tsconfig.json` `strict: true`. Currently notion-page-clone has `strict: false` + `noImplicitAny: false` + `strictNullChecks: false` — drift from baseline.

## Baseline error count

Enabled `strict: true` (and removed `noImplicitAny:false`, `strictNullChecks:false` overrides). Captured:

```
40 TypeScript errors
```

## Error code breakdown

| TS code | Count | Meaning |
|---------|-------|---------|
| TS7053 | 30 | Element implicitly `any` because expression can't index type |
| TS7006 | 8 | Parameter implicitly `any` |
| TS2537 | 1 | Type X has no matching index signature |
| TS18048 | 1 | X is possibly `undefined` |

## File-level hotspots

| File | Errors |
|------|--------|
| `frontend/slices/comments/hooks/useComments.ts` | 8 |
| `app/dashboard/` (multiple files) | 8 |
| `frontend/slices/comments/lib/PageCommentsContext.tsx` | 7 |
| `frontend/slices/inbox/hooks/useInbox.ts` | 6 |
| `frontend/slices/files/hooks/useFileUpload.ts` | 3 |
| `frontend/slices/editor/blocks/ImageBlock.tsx` | 3 |
| `frontend/slices/workspace-io/components/WorkspaceIODialog.tsx` | 1 |
| `frontend/slices/search/hooks/useSearch.ts` | 1 |
| `frontend/slices/files/hooks/useFileUrl.ts` | 1 |
| `frontend/slices/databases/lib/calcAggregate.test.ts` | 1 |

## Root cause pattern

Most errors stem from dynamic Convex API indexing — `api["features/search/queries"]` style strings. Convex codegen produces a typed object; string-indexing it loses type safety. Fixes:

1. Use static dotted access: `api.search.queries.search` (preferred — TS retains type)
2. Cast through `any-api` helper if dynamic path needed (SuperSpace pattern)
3. Add typed wrapper functions

## Plan

Do NOT flip `strict: true` in this PR. Captured baseline only. Follow-up PRs (one per file, max 8 errors each) tighten incrementally:

- [ ] Fix `useComments.ts` (8 errors)
- [ ] Fix `app/dashboard/` (8 errors)
- [ ] Fix `PageCommentsContext.tsx` (7 errors)
- [ ] Fix `useInbox.ts` (6 errors)
- [ ] Fix `useFileUpload.ts` (3 errors)
- [ ] Fix `ImageBlock.tsx` (3 errors)
- [ ] Fix singleton-error files (5 total)
- [ ] Final flip: `strict: true`, remove `noImplicitAny/strictNullChecks` overrides

## Reference

- TS strict docs: <https://www.typescriptlang.org/tsconfig/#strict>
- Convex any-api escape hatch: `~/projects/superspace/convex/_shared/anyApi.ts`
