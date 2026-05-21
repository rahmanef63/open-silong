# `notion` mega-slice lift plan — 2026-05-21

> Forward plan, not retrospective. Written so any agent (Claude / rr's
> agent / human contributor) can pick up the work cold.

**Goal**: lift `frontend/slices/notion/` from this repo into rr's
`frontend/slices/notion/` as a single drop-in mega-module that
downstream React projects can adopt with one provider + a
localStorage default. Resolves the long-standing "editor +
databases can't be lifted standalone" blocker by reframing them as
**peers inside one bundle**, not 2 independent modules.

Pair with:
- `docs/rr-sync/lift-status.md` — per-slice lift state (this plan
  unblocks the 🟡 "in mega-bundle only" rows for `editor`,
  `databases`, `templates`, `workspace-io`, `files`, `sharing`,
  `comments` — and adds them all as one consumable bundle)
- `frontend/slices/files/adapter/` — first proof of the
  storage-adapter pattern that this plan generalises
- `docs/notion-mega-slice.md` — existing API contract for the
  mega-slice (consumer DX side)

---

## TL;DR

| Question | Answer |
|---|---|
| Why a mega-bundle, not 2 separate modules? | Editor ↔ databases is a bidirectional dep (rows-of-a-database are pages, inline-database-blocks are editor blocks). Splitting them needs a render-prop seam in both directions — more refactor surface than bundling. |
| Why now? | DNS swapped, OSS-ready, legal-scrubbed, fallback project standing by. Lifting the mega-bundle is the last high-leverage portability work before flipping the repo public. |
| Reference pattern? | `files` slice (synced 2026-05-21 via storage-adapter). Same shape generalises. |
| Effort estimate? | ~3 weeks dedicated, 6 phases. Critical path = Phase 2 (editor refactor, ~36 Convex import sites). |
| Rollback if it breaks prod? | Per-phase commits. Each phase keeps the Convex path working in parallel — adapter is additive. Revert one commit if any phase regresses. |

---

## Why a mega-bundle (and not 2 modules)

### The coupling reality

`frontend/slices/editor/slice.manifest.json` declares
`deps.slices: [..., "databases", ...]`. Reason: an editor page can
embed an inline `DatabaseBlock` (Notion-canonical inline database).

`frontend/slices/databases/slice.manifest.json` declares
`deps.slices: [..., "editor", ...]`. Reason: a database row IS a
page (`rowOfDatabaseId` set), and opening that row renders
`<PageEditor>` in a sheet / dialog / dedicated route.

You can't lift one without the other without breaking import chains.

### Quantified portability gap

(Audit done 2026-05-21, see chat transcript of the same date.)

| Slice | Files | LOC | Direct Convex imports | Store imports | Peer slice deps | Routes |
|---|--:|--:|--:|--:|--:|--:|
| `editor` | 98 | 8,066 | **36** | ~25 | 16 | 0 hardcoded |
| `databases` | 148 | 11,581 | 0 ✅ | ~32 | 7-10 | 0 hardcoded |

Editor has the bigger code-side surgery (36 Convex sites). Databases
is already cleaner at the Convex layer but heavier at the store
layer. Both routed through `@/shared/lib/store`, which is the actual
Convex coupling point for databases.

### Existing infrastructure to reuse

- `frontend/slices/notion/` — mega-slice already exists, bundles
  editor + databases + templates + workspace-io + wrappers.
  Consumer API documented in `docs/notion-mega-slice.md`.
- `template-base/frontend/slices/notion/` in rr — mega-bundle has
  been copied across before, status 🟡 (in mega-bundle only, not
  standalone). This plan promotes it to standalone consumable.
- `frontend/slices/files/adapter/` — adapter contract template.

---

## Adapter contract (the one interface)

Single `NotionAdapter` interface, mounted via a single provider.
All Convex coupling moves behind this contract.

### Interface skeleton

```ts
// frontend/slices/notion/adapter/types.ts

export interface NotionAdapter {
  // ── Pages ──────────────────────────────────────────────
  pages: {
    /** Live snapshot of all pages in a workspace. Hook so the
     *  Convex adapter can use `useQuery` (live invalidation),
     *  localStorage adapter polls a custom event channel. */
    useList(ctx: { workspaceId: string }): Page[] | undefined;
    useOne(pageId: string | null | undefined): Page | null | undefined;

    create(input: PageCreateInput): Promise<string>;
    update(pageId: string, patch: Partial<Page>): Promise<void>;
    delete(pageId: string): Promise<void>;
    trash(pageId: string): Promise<void>;
    restore(pageId: string): Promise<void>;
    duplicate(pageId: string): Promise<string>;
    reorder(pageId: string, newIndex: number, parentId?: string): Promise<void>;

    // Block-level (block IS page.blocks[i], but mutations are first-class)
    addBlock(args: { pageId: string; afterIndex: number; type: BlockType; init?: Partial<Block> }): Promise<string>;
    updateBlock(args: { pageId: string; blockId: string; patch: Partial<Block> }): Promise<void>;
    deleteBlock(args: { pageId: string; blockId: string }): Promise<void>;
    duplicateBlock(args: { pageId: string; blockId: string }): Promise<string>;
    reorderBlocks(args: { pageId: string; orderedIds: string[] }): Promise<void>;
    replaceBlock(args: { pageId: string; blockId: string; nextBlock: Block }): Promise<void>;
  };

  // ── Databases ───────────────────────────────────────────
  databases: {
    useList(ctx: { workspaceId: string }): Database[] | undefined;
    useOne(dbId: string | null | undefined): Database | null | undefined;

    create(input: DatabaseCreateInput): Promise<string>;
    update(dbId: string, patch: Partial<Database>): Promise<void>;
    delete(dbId: string): Promise<void>;

    addProperty(args: { dbId: string; prop: PropertySchema }): Promise<string>;
    updateProperty(args: { dbId: string; propId: string; patch: Partial<PropertySchema> }): Promise<void>;
    deleteProperty(args: { dbId: string; propId: string }): Promise<void>;

    createView(args: { dbId: string; view: View }): Promise<string>;
    updateView(args: { dbId: string; viewId: string; patch: Partial<View> }): Promise<void>;
    deleteView(args: { dbId: string; viewId: string }): Promise<void>;

    // Rows = pages with `rowOfDatabaseId` set. Use `pages.*` for
    // row CRUD; this is just for "list rows of this DB" which has a
    // narrower index than the general page list.
    useRows(dbId: string): Page[] | undefined;
  };

  // ── Files (reuse existing FilesAdapter contract) ────────
  files: import("@/slices/files").FilesAdapter;

  // ── Optional capabilities ───────────────────────────────
  // Consumer can omit; consuming surfaces gracefully degrade
  // (AI button hidden, presence chip hidden, search returns []).
  ai?: {
    rewrite(args: { blockId: string; prompt: string }): Promise<string>;
    generate(prompt: string): AsyncIterable<string>;
    generateDatabaseRows(args: { dbId: string; prompt: string; n: number }): Promise<RowDraft[]>;
  };

  presence?: {
    useSubscribers(pageId: string): Presence[] | undefined;
    publish(args: { pageId: string; status: PresenceStatus }): Promise<void>;
  };

  search?: {
    pages(query: string): Promise<SearchPageHit[]>;
    databases(query: string): Promise<SearchDatabaseHit[]>;
  };

  // ── Identity (optional — for sharing/comments attribution) ──
  user?: {
    useCurrent(): User | null | undefined;
    useById(userId: string | null | undefined): User | null | undefined;
  };
}
```

### Provider pattern

```tsx
// app/providers.tsx (nosion — production, uses Convex)
import { NotionAppProvider, useConvexNotionAdapter } from "@/slices/notion";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const adapter = useConvexNotionAdapter();
  return <NotionAppProvider adapter={adapter}>{children}</NotionAppProvider>;
}

// rr / downstream demo — uses localStorage default
import { NotionAppProvider, useLocalStorageNotionAdapter } from "@/slices/notion";

export function Demo() {
  const adapter = useLocalStorageNotionAdapter();
  return (
    <NotionAppProvider adapter={adapter}>
      <NotionSidebar />
      {/* … */}
    </NotionAppProvider>
  );
}
```

### Why hooks for reads, promises for writes

Reads must be reactive (Convex `useQuery` / localStorage event
channel). Hooks let the adapter compose `useQuery` internally without
leaking it through the contract.

Writes are imperative (button clicked → mutate). Promises let
optimistic updates layer on top via the consumer's choice
(React state, TanStack Query mutations, the host store, …).

This matches the precedent set by `FilesAdapter.useUrl` (hook) +
`FilesAdapter.upload` (promise).

---

## Cycle resolution (editor ↔ databases)

Two strategies, used together:

### 1. Render-prop seams (preferred for the leaf components)

Editor's `<DatabaseBlock>` becomes a slot. The block registry
accepts a `<DatabaseBlock>` component as a prop on `<PageEditor>`.
Default: imports the real one from `@/slices/databases`. Consumer
can swap.

Databases' `<RowDetailSheet>` / `<RowDetailDialog>` accept a
`PageEditor` render-prop. Default: imports the real one from
`@/slices/editor`.

```tsx
<NotionAppProvider
  adapter={adapter}
  components={{
    DatabaseBlock,  // optional — defaults to bundled DatabaseBlock
    PageEditor,     // optional — defaults to bundled PageEditor
  }}
>
```

### 2. Shared type surface (already mostly done)

All cross-slice types (`Block`, `Page`, `Database`, `View`,
`Property`, `PropertyValue`) already live in
`frontend/shared/types/domain.ts`. Keep them there. Neither slice
defines types the other needs to import — they all come from
shared.

### Outcome

Editor + databases can be developed and tested in isolation in their
own slice directories. They only KNOW about each other through:
1. The shared type surface
2. The render-prop slots (with defaults that auto-resolve to the
   bundled component)

The mega-slice `notion/index.ts` is the one place that wires the
defaults — consumer can override per slot.

---

## Implementation phases

Six phases, each ends with a green typecheck + smoke test + commit.
No phase touches production state irreversibly — every phase is
additive (Convex path keeps working in parallel until Phase 4).

### Phase 0 — Audit + contract lock (2-3 days)

**Output**: pinned `NotionAdapter` TypeScript interface,
exhaustive map of Convex / store import sites → adapter methods.

Tasks:
1. `grep -rln "@convex/_generated\|useMutation\|useQuery" frontend/slices/editor` — confirm the 36 sites
2. `grep -rln "@/shared/lib/store" frontend/slices/{editor,databases}` — list every store consumer
3. For each site, write the target adapter method on a table (or
   inline in the doc — `editor/BlockEditor.tsx:42 useMutation(api.pages.updateBlock)` → `adapter.pages.updateBlock`)
4. Lock the interface — write `frontend/slices/notion/adapter/types.ts` with the FULL contract
5. Write `docs/api/notion-adapter.md` — the consumer-facing contract docs
6. Decide observable strategy: hooks-only for v1 (matches files
   precedent). Don't introduce rxjs/observables yet.

**Gate**: contract file compiles; doc reviewed by Claude (if working with sub-agents, ask `Plan` agent to validate).

### Phase 1 — Adapter interface extraction (3-4 days)

**Output**: working `<NotionAppProvider>` mounted with a no-op
adapter; existing code still uses Convex directly.

Tasks:
1. Create `frontend/slices/notion/adapter/`:
   - `types.ts` (locked in Phase 0)
   - `context.tsx` — `NotionAdapterProvider`, `useNotionAdapter()`
   - `convexAdapter.tsx` — wraps existing Convex bindings, exports
     `useConvexNotionAdapter()` (skip-listed in rr-sync.json)
   - `localStorageAdapter.ts` — exports `useLocalStorageNotionAdapter()`
   - `noopAdapter.ts` — throws helpful errors when called; used
     when consumer forgets to mount
2. Wire `<NotionAppProvider adapter={...}>` to install context
3. Mount in `app/providers.tsx` with `useConvexNotionAdapter()` (no behavior change yet — provider is a no-op until consumers wire up)
4. Add ESLint rule (or grep check in CI) preventing new `@convex/_generated` imports inside `frontend/slices/{editor,databases,notion}` — catches regression during the refactor

**Gate**: `pnpm typecheck` + `pnpm test` green; provider visible in React DevTools.

### Phase 2 — Refactor editor slice (4-5 days) ⚠ CRITICAL PATH

**Output**: zero direct Convex imports inside `frontend/slices/editor/`.

Tasks per file (36 sites — work in batches of 5-8):
1. Replace `import { api } from "@convex/_generated/api"` + `useMutation/useQuery` calls with `useNotionAdapter().pages.*` / `useNotionAdapter().ai?.*` / etc.
2. Update prop-types if hook signature shifts
3. Test each file in isolation (vitest + manual click-through)

Specific tricky areas:
- `BlockEditor.tsx` — the block CRUD hub. Refactor with care; smoke test paste, drag, slash menu, undo
- `useFullPage.ts` — page subscription. Convex `useQuery` → adapter `useOne`
- `SeenByBadge.tsx` + `useReadReceipt.ts` — presence. Mark as optional capability (`adapter.presence?.*`); hide UI if absent
- `useInlineAiShortcut.ts` + `AskAIPopover.tsx` + `SelectionToolbar.tsx` — AI. Mark optional (`adapter.ai?.*`); hide buttons if absent
- `image/useUpload.ts` + `media/useUpload.ts` — file upload. Already adapter-driven via files slice — just wire `adapter.files`
- `pasteHandler.ts` — only imports the `Id<T>` type. Change to `string` (matches the boundary-cast pattern documented in CLAUDE.md)

**Render-prop seam**: introduce `<PageEditor components={{ DatabaseBlock?: ComponentType }}>` here. Default to the imported `<DatabaseBlock>` from `@/slices/databases` if not provided.

**Gate**: 
- `grep "@convex/_generated" frontend/slices/editor` returns zero
- `pnpm typecheck` + `pnpm test` green
- Manual smoke (5 min): create page, type, slash menu, indent, drag block, paste image, run AI rewrite, see presence chip, switch to mobile

### Phase 3 — Refactor databases slice (3-4 days)

**Output**: zero `useStore()` / `@/shared/lib/store` imports inside `frontend/slices/databases/`.

Tasks per file (~32 store-consumer sites):
1. Replace `useStore()` / `usePages()` / `useDatabases()` / etc. with `useNotionAdapter().databases.*` / `useNotionAdapter().pages.*`
2. Specifically the 6 views (Table, Board, List, Gallery, Calendar, Feed) — each consumes the row list. Use `adapter.databases.useRows(dbId)`
3. Property cells (`PropertyCell.tsx`) — update + delete via `adapter.databases.updateProperty`
4. View config (`EditPropertyPanel.tsx`, etc.)
5. CSV / JSON import paths — already pure-data via `adapter.databases.*` mutation calls

**Render-prop seam**: introduce `<DatabasePage components={{ PageEditor?: ComponentType }}>` and the same on `<RowDetailSheet>` / `<RowDetailDialog>`. Default to the imported `<PageEditor>` from `@/slices/editor`.

**Gate**:
- `grep "@/shared/lib/store" frontend/slices/databases` returns zero
- `pnpm typecheck` + `pnpm test` green
- Manual smoke: create DB, add 3 properties, create row, open row sheet, switch to each of 6 views, filter, sort, group

### Phase 4 — Mega-slice consolidation (2-3 days)

**Output**: `frontend/slices/notion/` is a clean adapter-driven mega-bundle that consumers can drop in.

Tasks:
1. Update `frontend/slices/notion/index.ts` barrel:
   ```ts
   export { NotionAppProvider } from "./NotionAppProvider";
   export { NotionPage } from "./NotionPage";
   export { NotionDatabase } from "./NotionDatabase";
   export { NotionSidebar } from "./NotionSidebar";
   // Adapter contract + reference implementations
   export type { NotionAdapter } from "./adapter/types";
   export { useNotionAdapter } from "./adapter/context";
   export { useLocalStorageNotionAdapter } from "./adapter/localStorageAdapter";
   // useConvexNotionAdapter() is skip-listed — not exported
   ```
2. Write `frontend/slices/notion/slice.manifest.json` with `deps.convex: []` (the win — mega-slice declares ZERO direct Convex deps; only the convexAdapter sub-file has them, and that's skip-listed)
3. Update `rr-sync.json` `skipFiles` to include any new convex-adapter files
4. Add `frontend/slices/notion/README.md` — consumer onboarding (4 steps: install, mount provider, render, customise)
5. Update `docs/notion-mega-slice.md` to match the new shape

**Gate**: `node scripts/sync-to-rr.mjs notion --dry-run` shows no convex import would land in rr.

### Phase 5 — Lift to rr (1-2 days)

**Output**: rr's `frontend/slices/notion/` compiles + renders the demo with localStorage data.

Tasks (mostly rr-side — see [rr agent coordination](#rr-agent-coordination) below):
1. `node scripts/sync-to-rr.mjs notion` from this repo
2. rr-side: add catalog entry to `lib/content/slices.ts` (slug `notion`, tags `["notion-like", "mega-bundle"]`, source `notion-page-clone`)
3. rr-side: add `app/demo/notion/page.tsx` mounting `<NotionAppProvider adapter={useLocalStorageNotionAdapter()}>` with seeded sample data
4. rr-side: `pnpm typecheck && pnpm build` green
5. Update `docs/rr-sync/lift-status.md` — move `editor`, `databases`, `templates`, `workspace-io`, `files`, `sharing`, `comments` from 🟡 → ✅ (or a new 🟢 "synced as part of mega-bundle" status)

**Gate**: open rr demo page, create page, type, slash menu, add database block, switch views — all without a backend.

### Phase 6 — Polish + announce (1 day)

Tasks:
1. Update `CHANGELOG.md` with the lift entry
2. Update `MEMORY.md` (memory file) with adapter pattern as canonical lift technique
3. Add example consumer code to README of mega-slice
4. (Optional) Loom video walkthrough for downstream consumers
5. Tag a release in this repo: `v0.2.0-mega-slice-lift`

**Gate**: doc reads cleanly when handed to a fresh contributor (test: hand to Claude in a new session, ask "can you adopt this in a new React project?" — should succeed without follow-up questions).

---

## Validation gates (summary)

| Gate | When | What |
|---|---|---|
| G0 | End of Phase 0 | Contract `types.ts` compiles; doc reviewed |
| G1 | End of Phase 1 | Provider mounted, no behaviour change |
| G2 | End of Phase 2 | Zero `@convex/_generated` in editor; manual smoke |
| G3 | End of Phase 3 | Zero `@/shared/lib/store` in databases; manual smoke |
| G4 | End of Phase 4 | `sync-to-rr.mjs notion --dry-run` clean |
| G5 | End of Phase 5 | rr demo page works with localStorage |
| G6 | End of Phase 6 | Fresh-agent onboarding test passes |

---

## Rollback strategy

Every phase ends with a commit. If a phase regresses production:

```bash
# Identify phase commit
git log --oneline | grep "mega-lift phase"

# Revert just that phase (additive nature means it's clean)
git revert <phase-N-commit>
git push origin main
```

Adapter is **additive** until Phase 4 — Convex direct path stays
wired in `convexAdapter.tsx` even after editor / databases switch to
`useNotionAdapter()`. So if Phase 2 or 3 has a latent bug, we
revert that phase's commit and the adapter contract sits unused but
harmless until we re-attempt.

Phase 4 is the only "subtractive" phase (deletes direct Convex
imports). Have a checkpoint commit just before Phase 4 starts so
revert is single-shot.

---

## rr agent coordination

> Section for rr's AI agent (or any contributor working on the rr
> side of the sync). Read this end-to-end before touching anything.

### What you (rr agent) need to know

1. **You consume a TypeScript contract.** The interface is at
   `frontend/slices/notion/adapter/types.ts` in this repo
   (`github.com/rahmanef63/open-silong`). After Phase 4 lands it
   gets copied into rr as `frontend/slices/notion/adapter/types.ts`
   verbatim. Treat it as the source of truth — don't fork it. If
   you need a method the contract doesn't expose, file an issue
   back to this repo (link in §"Feedback loop" below).

2. **Default backend = `useLocalStorageNotionAdapter`.** rr ships
   this as the demo default. No backend, no auth, ~5-10MB browser
   quota. Sufficient for catalog demos, template gallery, and
   onboarding flows. Mount it like:
   ```tsx
   import { NotionAppProvider, useLocalStorageNotionAdapter }
     from "@/slices/notion";
   // ...
   <NotionAppProvider adapter={useLocalStorageNotionAdapter()}>
     <YourLayout />
   </NotionAppProvider>
   ```

3. **`convexAdapter.tsx` is skip-listed.** It contains the
   open-silong-specific Convex bindings. `rr-sync.json.skipFiles`
   ensures it never lands in rr. If you ever see a Convex import in
   rr's `frontend/slices/notion/`, the skip list is broken — flag
   it before commiting.

4. **Cross-slice imports go through `@/slices/notion`.** Other rr
   slices that want to embed a notion page should import via the
   barrel: `import { NotionPage } from "@/slices/notion"`. Never
   deep-import into `frontend/slices/notion/components/...`. This
   keeps the contract stable across sync rounds.

### Catalog entry shape (rr-side)

Add to `lib/content/slices.ts`:

```ts
{
  slug: "notion",
  title: "Notion-inspired workspace (mega-bundle)",
  description:
    "Drop-in block editor + 6 database views + templates + " +
    "workspace IO + sharing + comments. Adapter-driven — wire " +
    "your own backend or use the localStorage default.",
  tags: ["notion-like", "mega-bundle", "editor", "databases"],
  source: "notion-page-clone",
  manifestDeps: {
    shared: [/* derived from notion/slice.manifest.json */],
    slices: [],            // mega-bundle exposes peers internally
    convex: [],            // ZERO direct convex deps post Phase 4
  },
  adapter: {
    interface: "NotionAdapter",
    interfacePath: "@/slices/notion/adapter/types",
    defaultImpl: "useLocalStorageNotionAdapter",
    optionalCapabilities: ["ai", "presence", "search", "user"],
  },
}
```

### Lift sequence (rr-agent task list when this repo signals "Phase 4 done")

1. Pull latest from open-silong: `git pull` in your local checkout
2. From open-silong dir: `node scripts/sync-to-rr.mjs notion`
3. Verify: `cd ../resources && pnpm typecheck` — expect green
4. Add catalog entry (shape above)
5. Add demo page: `app/demo/notion/page.tsx` with seeded sample data
6. `pnpm dev` and click through: page editor, slash menu, database
   block, view switcher
7. Update rr-side `CHANGELOG.md` with the BU (or next available)
   wave entry
8. Push to rr's main
9. Open back-reference in open-silong: comment on the lift PR in
   this repo with "rr-side lifted at commit <SHA>"

### Adapter pitfalls to watch

- **Hook order**: adapter reads (`useList`, `useOne`, `useUrl`,
  `useCurrent`) must be called unconditionally per React's hook
  rules. If you're conditionally subscribing, pass `null` / undefined
  as the id rather than guarding the hook with an `if`.
- **Optimistic updates**: the contract is fire-and-forget promises.
  If you need optimism, layer it in your adapter implementation
  (the Convex adapter uses `withOptimisticUpdate`). Don't bake
  optimism into the contract.
- **Errors**: write methods reject with `Error`. Consumer surfaces
  catch + show toast via `frontend/shared/lib/error.ts` (or rr's
  equivalent). Don't swallow errors in your adapter.
- **Realtime channel**: localStorage adapter polls + listens to
  `storage` events for cross-tab sync. Not real realtime — be
  honest with consumers (1-2 sec staleness).
- **Schema drift**: if rr's `Page` / `Database` shape diverges from
  open-silong's `frontend/shared/types/domain.ts`, the contract
  breaks. Don't fork the domain types. If you need a new field,
  PR it back to open-silong first.

### Feedback loop

When rr's agent finds a gap (adapter method missing, contract
unclear, sample data lacking), file it as:

- GitHub issue on `rahmanef63/open-silong` with label
  `lift-feedback` (create the label if it doesn't exist)
- Cross-link from rr-side `docs/rr-sync/lift-status.md` (or
  equivalent) with the issue number
- Tag `@maintainers` in the issue

This repo will action the gap in the next lift round (typically
within 1-2 weeks).

### Useful commands (rr agent reference)

```bash
# From open-silong root — dry-run the lift, see what would change
node scripts/sync-to-rr.mjs notion --dry-run

# From open-silong root — actually do the lift (uses rr-sync.json
# scrubs + skipFiles)
node scripts/sync-to-rr.mjs notion

# From open-silong root — check what's drifted in rr since last lift
node scripts/rr-sync-status.mjs

# From rr root — verify no convex import landed
grep -r "@convex/_generated" frontend/slices/notion/ && echo "BROKEN" || echo "clean"

# From rr root — exercise the adapter
pnpm dev  # then open /demo/notion
```

---

## Success criteria

Plan is complete when ALL of:

- [ ] `frontend/slices/notion/slice.manifest.json` declares `deps.convex: []`
- [ ] `grep -r "@convex/_generated" frontend/slices/{editor,databases,notion}` returns zero
- [ ] `grep -r "@/shared/lib/store" frontend/slices/{editor,databases}` returns zero
- [ ] `node scripts/sync-to-rr.mjs notion --dry-run` reports zero blockers
- [ ] rr's `frontend/slices/notion/` compiles + renders the demo
- [ ] rr's catalog has `notion` entry with `source: notion-page-clone`
- [ ] `docs/rr-sync/lift-status.md` moves `editor`, `databases`,
  `templates`, `workspace-io`, `sharing`, `comments` to ✅ (via
  mega-bundle) — leaves `files` ✅ standalone
- [ ] `MEMORY.md` updated with adapter pattern as the canonical lift
  technique for any future complex slice
- [ ] CHANGELOG entry shipped
- [ ] No production regression on `silong.rahmanef.com`
  (verified by `silong-fb.rahmanef.com` fallback as control)

---

## Open questions (resolve in Phase 0)

1. **Observable lib in v1**: hooks-only (matches `files` adapter) vs.
   introduce `rxjs` / a small `Observable<T>` shim. *Lean*: hooks
   only. Defer Observable until a real need (cross-tab sync, SSE
   integration).

2. **`<NotionAppProvider components={…}>` shape**: positional
   render-prop slots vs. registry object. *Lean*: registry object
   with named keys (`DatabaseBlock`, `PageEditor`, `Comment`,
   `Mention`). Extensible without a breaking change.

3. **rr's demo data**: seed at first mount vs. ship a `seed.json`
   the localStorage adapter pre-populates. *Lean*: seed.json — gives
   reviewers something to click immediately, easy to regenerate.

4. **Multi-workspace in the contract**: should the localStorage
   adapter implement `workspaceId` scoping or treat the whole demo
   as one workspace? *Lean*: stub a single hard-coded workspace; if
   downstream consumers want multi, they implement their own
   adapter. Keep the demo simple.

5. **Backwards compat for current open-silong**: the refactor is
   internal — no public API change. But the `<NotionAppProvider>`
   mount in `app/providers.tsx` is new. If anyone's vendored
   `frontend/slices/notion/` from a pre-Phase-4 commit, their app
   won't mount providers. *Lean*: not our problem; the lift is
   v0.2.0, semver-major-style. Document in CHANGELOG.

---

## References

- `frontend/slices/files/adapter/` — reference implementation of the
  adapter pattern
- `docs/notion-mega-slice.md` — existing consumer API for the
  mega-slice
- `docs/rr-sync/lift-status.md` — per-slice lift state, updated
  per round
- `docs/rr-sync/2026-05-20-pivot-nosion-source-of-truth.md` — why
  open-silong + rr is a two-repo system
- `docs/rr-sync/README.md` — rr-sync infrastructure overview
- `scripts/sync-to-rr.mjs` — the lift script
- `rr-sync.json` — scrubs + skipFiles + pathMap config

---

## Approval log

| Date | Reviewer | Decision |
|---|---|---|
| 2026-05-21 | Claude Opus 4.7 (drafted) | — |
| _pending_ | Rahman | go / no-go on Phase 0 |
| _pending_ | rr agent | review §rr-agent-coordination |

When Rahman signs off, Phase 0 starts. When rr agent acknowledges,
the lift sequence is unblocked end-to-end.
