# rr-sync — incremental slice sync to Rahman Resources

**Purpose:** notion-page-clone is the upstream source-of-truth for features being lifted to `~/projects/resources` (rr). Slices ship in waves, each carrying its own `shared/*` dependencies. This pipeline keeps both repos coherent across many small updates.

---

## Files

| Path | Role |
|---|---|
| `rr-sync.json` | Registry. SSOT for what's tracked + per-file hash ledger. |
| `scripts/sync-to-rr.mjs` | Sync engine. One slice at a time. |
| `scripts/rr-sync-status.mjs` | Drift report. Used by pre-push nag. |
| `scripts/regen-rr-features-doc.mjs` | Auto-rebuild `docs/rr-sync/features.md`. |
| `docs/rr-sync/features.md` | Auto-gen inventory (do not hand-edit). |
| `docs/rr-sync/lift-status.md` | Per-slice lift state (synced / blocked / mega-bundle only). |
| `docs/rr-sync/2026-05-21-notion-mega-lift-plan.md` | Forward plan for lifting editor + databases as one adapter-driven mega-bundle. Read before refactoring those slices. |

---

## Workflow

### First time lifting a slice (e.g. `wiki`)

```bash
# 1. preview
pnpm sync:rr wiki --dry-run

# 2. real sync
pnpm sync:rr wiki

# 3. inspect rr-side
cd ~/projects/resources
git status
git diff frontend/slices/wiki

# 4. commit + push rr-side (script prints suggested message)
git add frontend/slices/wiki frontend/shared/
git commit -m "feat(wiki): sync from notion-page-clone@<sha>"
git push origin main
```

### After editing the slice in nosion later

```bash
# nosion side:
git status                       # confirm you edited wiki/
git commit -am "fix(wiki): ..."  # commit upstream change

# re-sync (script will only update files that actually changed)
pnpm sync:rr wiki

# rr-side: commit downstream
cd ~/projects/resources && git add . && git commit && git push
```

### Status check

```bash
pnpm sync:rr:status              # table of all tracked slices + drift
node scripts/sync-to-rr.mjs --list  # quick name list
```

The pre-push hook auto-prints a non-blocking nag for any tracked slice that drifted since last sync.

### Conflict — rr-side has local edits

If you (or another agent) hand-edited a file on the rr side after it was synced, the script blocks:

```
⚠ conflicts (1) — rr-side diverged from last sync:
    frontend/shared/lib/utils.ts
```

Resolve one of:
- Bring the rr-side edit back upstream (cp from rr → nosion, commit, re-sync)
- `pnpm sync:rr wiki --force` — overwrite rr-side (loses the edit)
- Manual merge

---

## Wave-order rule (corruption guard)

A slice's `slice.manifest.json` lists `deps.slices[]` — peer slices it imports from. The engine refuses to sync a slice whose peer is not yet tracked:

```
✗ blocked. peer slices not yet tracked in rr:
    - editor
  lift those first (wave order keeps rr coherent).
```

Lift **leaf slices** (zero `deps.slices`) before **branch slices**. See `docs/rr-sync/features.md` after first sync for the per-slice dep tree.

---

## Shared coherence (the corruption story you wanted to avoid)

Scenario: slice A and slice B both import `shared/lib/foo.ts`. You lift A first. Later you edit `foo.ts` in nosion (for B's sake). When you lift B:

- B's manifest pulls `foo.ts` into its file list
- Sync recomputes `foo.ts` hash → differs from registry → updated in rr
- A's file list ALSO contains `foo.ts`, so `pnpm sync:rr A` next time will see hash matches registry, skip

The shared file ledger lives in `rr-sync.json.fileHashes` — one global table keyed by relative path. Last writer wins, and `docs/rr-sync/features.md`'s "Shared file → consumers map" section flags which shared paths are touched by 2+ tracked slices (= cross-cutting infra to handle carefully).

**Practical guard:** before editing a shared file, run `pnpm sync:rr:status`. If multiple tracked slices reference it, plan a coordinated re-sync of all of them.

---

## Scrubs (brand sanitization)

`rr-sync.json.scrubs` is an ordered list of `[from, to]` literal replacements applied on every text file before write. Defaults:

- `Nosion` → `Host`
- `nosion` → `host`

Extend per situation:

```json
"scrubs": [
  ["Nosion", "Host"],
  ["nosion", "host"],
  ["notion-page-clone", "rr-host"]
]
```

Binary files (png/jpg/woff/etc) are skipped automatically.

---

## What gets skipped

- `convex/_generated/*` — per-project codegen, always regenerated at the dest
- `node_modules/`, `.next/` — never copied
- pathMap entries with `skip: true` (e.g. `frontend/shared/ui/` — rr has its own shadcn primitives at `components/ui/`)
- pathMap entries with `to: "SKIP_NPM"` (e.g. `frontend/shared/lib/utils` → `rahman-shared/lib/utils` npm pkg)

## Known gaps

### Convex API lifting

Frontend slices that call `api.foo.bar` (e.g. `api.features.wiki.mutations.enable`) DEPEND on convex modules that the manifest auto-generator misses (it only scans `@convex/_generated` literal imports, not the actual `api.<x>.<y>` call chain).

For now, only lift slices that have **zero `api.*` calls in their frontend code** (16 candidates as of 2026-05-19: backlinks, code-block, comments, database-cell-selection, database-presets, database-templates, equation, files, mentions, notifications, search, simple-table, snapshots, theme-presets, trash, plus the `notion` mega-wrapper).

Slices that need convex (editor, databases, wiki, library, admin-panel, dashboard, etc.) require either: (a) full convex feature dir lift (heavy, cross-cutting), (b) generator improvement to scan api.* paths, OR (c) interface-injection refactor in the slice.

### npm dep cross-check

After every sync, the engine scans bare npm imports in copied files and cross-checks against rr's `package.json`. Missing deps are reported with the install command:

```
⚠ rr is MISSING npm deps (1):
    katex  →  add ^0.16.45
  → cd ~/projects/resources && pnpm add katex@^0.16.45
```

Version drift between rr and nosion is also flagged (informational, non-blocking).

The engine WILL NOT auto-install on rr — manual step, deliberate.

### Manifest gaps

`generate-slice-manifests.mjs` scans `@/shared/*` + `@convex/_generated/*` imports. It misses:
- `api.<x>.<y>` call chains (convex feature deps)
- Dynamic imports `import("...")` inside hooks
- Re-exports through barrel files (sometimes — depends on depth)

Re-run the generator after any new import to refresh manifests. If lift still misses files, hand-edit the manifest's `deps.convex` / `deps.shared` array.

---

## Adding a new slice to track

Just call `pnpm sync:rr <slug>`. The script:
1. Reads `frontend/slices/<slug>/slice.manifest.json`
2. Resolves all files (slice + shared + convex, recursive)
3. Hashes each, copies to rr (with scrubs)
4. Writes `rr-sync.json.tracked[<slug>]` + updates `fileHashes`
5. Regenerates `docs/rr-sync/features.md`

No separate "register" step. First sync = register.

## Untracking

Delete the slice's entry from `rr-sync.json.tracked` + delete its rr-side directory manually. Stale entries in `fileHashes` are harmless (they get overwritten on next sync that touches them).
