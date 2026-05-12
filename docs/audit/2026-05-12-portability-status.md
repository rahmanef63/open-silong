# Portability audit — completion status

**Updated 2026-05-12.** Tracks every action item from
`2026-05-11-portability.md` through to ship.

| # | Action                                  | Status   | Notes |
|---|-----------------------------------------|----------|-------|
| 1 | Promote `icon-picker` → `shared/`       | ✅ done   | git mv preserved history; 46 import sites swept |
| 2 | Extract `ROUTES` constants              | ✅ done   | `frontend/shared/lib/routes.ts` — `ROUTES` (relative) + `ROUTES_ABS` (absolute) |
| 3 | Tailwind preset                         | ✅ N/A    | Tailwind v4 — no `tailwind.config.*` exists. Design system is the `@theme inline` block in `app/globals.css`. Portability path: copy that file alongside slices. See "On #3" below. |
| 4 | Drop `router-compat` from slices        | ✅ done   | New `frontend/shared/lib/router/index.tsx` exposes a basename-via-context API; old `router-compat.tsx` is now a thin re-export. Sweep moved 17 files to `@/shared/lib/router`. Dashboard wraps with `<RouterProvider basename="/dashboard">` |
| 5 | Split `useStore()` into per-domain hooks| ✅ done   | `frontend/shared/lib/store/hooks.ts` exports `usePages` `useDatabases` `useBlocks` `useWorkspaces` `usePreferences` `useUser` `useRecents` `useDatabaseProperties` `useDatabaseRows` `useDatabaseViews` `useSnapshotsStore` `useUndoRedo` `useAuth`. Re-exported from `@/shared/lib/store`. Old `useStore()` untouched — opt-in migration |
| 6 | Move `WorkspaceIOProvider` to shared    | ✅ done   | Now at `frontend/shared/providers/WorkspaceIOProvider.tsx`. 3 consumer slices (editor, sidebar, library) sweep to `@/shared/providers`. Old `slices/workspace-io` index re-exports for back compat |
| 7 | Promote `database-row*` into databases  | ✅ done   | `frontend/slices/databases/row/` and `databases/row-selection/`. Re-exported from `@/slices/databases` |
| 8 | Unify convex paths to `features/<name>/`| ✅ N/A    | Decision: don't unify. See "On #8" below |
| 9 | Slice manifest + copy script            | ✅ done   | `scripts/generate-slice-manifests.mjs` writes `slice.manifest.json` per slice (35 generated). `scripts/copy-slice.mjs` reads them, recursively copies declared deps |
| 10| Monorepo split (`@nosion/core` etc.)    | ⏸ deferred| Strategic. Requires separate repo + build pipeline. The slice manifest (#9) covers the copy-slice use case for now. See "On #10" below |

---

## On #3 — why "no Tailwind preset" is the right answer

Tailwind v4 deprecated the JS config object. The design tokens that
used to live in `tailwind.config.ts > theme.extend` now live inline
in CSS via `@theme inline { … }`. Nosion has no `tailwind.config.*`
file at all.

There is therefore no preset to extract. The portability story is:

- Copy the `@theme inline { … }` block from `app/globals.css` into
  the target project's global CSS.
- Copy the `:root` HSL variable declarations + dark-mode overrides.
- Copy any utility classes Nosion-slices depend on
  (`.scrollbar-thin`, `.prose-editor`, …).

This is a single file copy — strictly easier than a JS preset. No
work needed.

---

## On #8 — why we keep the convex hybrid layout

`convex/` today is a mix:
- Top-level fns: `pages.ts`, `databases.ts`, `workspaces.ts`,
  `users.ts`, `snapshots.ts`, `recents.ts`, `preferences.ts`,
  `invites.ts`, `maintenance.ts`, `crons.ts`, `auth.ts`.
- Nested under `features/`: `analytics/`, `comments/`, `files/`,
  `inbox/`, `mentions/`, `search/`, `wiki/`.
- Domain folders: `admin/`, `ai/`, `import/`, `mcp/`,
  `templates/`, `feedback/`, `forms/`.

Two things stopped a "move everything to features/" migration:

1. **Convex API IDs are file paths.** Moving `pages.ts` to
   `features/pages/queries.ts` rebases every call site from
   `api.pages.list` → `api.features.pages.queries.list`. Hundreds
   of sites. High blast radius for zero functional gain.
2. **Both layouts are first-class in Convex's type generator.**
   `_generated/api.d.ts` produces correct nested types either way.

The portability path doesn't actually need uniformity — copy-slice
(#9) reads each manifest's `deps.convex` array and copies the named
top-level convex sub-paths.

Decision: leave structure as-is. Future new convex modules go under
`features/<name>/` for new code; legacy top-level files stay.

---

## On #10 — why monorepo split is deferred

Splitting into `@nosion/core` + `@nosion/slices` packages is a
multi-day infrastructure task: separate `package.json`, build
pipeline (rollup/tsup/turborepo), publishing target (npm or git
subtree), CI, type-only entry points, etc.

The copy-slice flow (#9) covers the only concrete consumer scenario
articulated so far ("copy a slice into another project"). Monorepo
becomes worthwhile when:

- 2+ downstream projects need to track upstream changes (currently 0).
- You want versioned releases of slices (currently we don't ship
  semver).
- A second product wants to depend on Nosion (no roadmap commitment).

When any of those land → revisit. Until then the cost > benefit.

---

## How a downstream project consumes a slice now

```bash
# from a Nosion checkout
node scripts/copy-slice.mjs templates --to ../my-other-app/src/features

# what happens:
# 1. Reads frontend/slices/templates/slice.manifest.json
# 2. Recursively copies the slice + every declared shared/ + convex/ dep
# 3. Prints a "next steps" checklist (RouterProvider basename, env vars, etc.)
```

Per-slice manifest format:

```json
{
  "name": "templates",
  "description": "AI-powered template gallery",
  "deps": {
    "shared":  ["components/icon-picker", "ui/button", ...],
    "slices":  ["editor"],
    "convex":  ["templates", "_generated"]
  },
  "notes": "Optional human-readable hints"
}
```

Manifests auto-regenerate via `node scripts/generate-slice-manifests.mjs`
— rerun after structural changes.

---

## Final coupling score (per audit rubric)

|              | 2026-05-11 | 2026-05-12 |
|--------------|------------|------------|
| Severity A   | 6          | 11         |
| Severity B   | 14         | 18         |
| Severity C   | 6          | 1          |

The shift comes from #1 (icon-picker promotion), #4 (router
basename), #5 (per-domain hooks), #6 (workspace-io shared),
#7 (db-row consolidation), and #9 (manifest + script). The
remaining C-severity slice is the editor cluster — too tangled
with blocks/databases/snapshots/comments to portably extract; needs
a deliberate refactor pass that's out of scope for portability.
