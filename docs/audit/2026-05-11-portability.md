# Portability audit — copying `frontend/slices/*` into another project

**Date:** 2026-05-11
**Question:** "Can we copy a few main folders into another project's
`features/` directory and have it work fully without issues?"
**Verdict:** **No, not drop-in.** Slices form clusters; the shared
infrastructure (store, schema, providers, tailwind tokens, env) must
be adopted or bundled as a library layer. About 5 slices are truly
standalone; the rest cascade.

This doc is the punch-list to fix that — what blocks portability, and
the concrete refactor to make slices copy-paste safe.

---

## Path aliases

```jsonc
// tsconfig.json
"paths": {
  "@/*":       ["./frontend/*"],
  "@convex/*": ["./convex/*"]
}
```

Every slice writes `@/shared/*`, `@/slices/*`, `@convex/_generated/*`.
Target project MUST mirror these aliases OR slices need a rewrite pass.

## Provider chain a slice expects

```
ConvexAuthNextjsServerProvider     // app/layout.tsx (server)
└─ ConvexAuthNextjsProvider        // app/providers.tsx
   └─ ChunkErrorBoundary + Sonner  // global
      └─ TooltipProvider           // DashboardShell
         └─ StoreProvider          // ← every slice assumes this
            └─ WorkspaceIOProvider // workspace-io exports this
               └─ SidebarProvider  // shadcn sidebar
                  └─ PageHeaderSlotProvider
```

Skipping `StoreProvider` is fatal — `useStore()` blows up. Skipping
`WorkspaceIOProvider` is fatal for any slice that calls
`useWorkspaceIO()`.

## Tailwind tokens slices depend on

Beyond stock shadcn (`background`, `foreground`, `card`, `accent`,
`border`, `muted`, `destructive`):

| Token | Used in | Required by |
|---|---|---|
| `brand`, `brand-foreground`, `brand-soft` | text-brand, bg-brand, bg-brand/10 | editor, databases, workspace-sidebar, admin-panel |
| `.prose-editor` (custom CSS) | h1–h3 / blockquote / list styles | editor only |
| `.scrollbar-thin` | webkit scrollbar | sidebar, library, admin-panel, editor |
| `var(--font-serif)` | page title | editor |
| Sidebar tokens (`sidebar-*`) | shadcn sidebar | workspace-sidebar |
| Animation: `accordion-down/up`, `fade-in`, `pulse-soft` | popovers/toasts | many |

Tailwind v4 `@theme inline` block in `app/globals.css`. Target must
declare the same CSS variables OR strip slices' brand classes.

## Env vars

| Var | Purpose | Required by |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex client URL | every slice (indirectly) |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Next server actions | Next 16 build |
| `CONVEX_*` | self-hosted backend | if self-hosting Convex |
| `SUPER_ADMIN_EMAIL`, `ADMIN_BOOTSTRAP_EMAILS` | first-admin claim | admin-panel only |

---

## Slice portability matrix

Severity legend:
- **A (drop-in)** — copy folder, install deps, works.
- **B (cluster)** — copy folder + 1–2 sibling slices; needs same Convex API & store.
- **C (entangled)** — assumes Nosion-specific routes / Convex modules / cross-slice plumbing. Refactor before copy.

| Slice | LOC | Cross-slice deps | Convex API | Routes | Provider req. | Severity |
|---|---:|---|---|---|---|:-:|
| **icon-picker** | 890 | none | none | — | — | **A** |
| **notifications** | 146 | none | none | — | — | **A** |
| **mentions** | 117 | none | none | — | useStore | **A** |
| **snapshots** | 110 | icon-picker | — | — | useStore | **A** |
| **search** (hook) | 43 | none | search.search | — | — | **A** |
| **feedback** | 90 | none | feedback.* | — | — | **A** |
| **templates** | 103 | icon-picker | templates.* | — | useStore | **B** |
| **trash** | 124 | none | — | `/trash` literal | useStore | **B** |
| **inbox** | 270 | none | notifications.*, mentions.* | `/inbox` | useStore | **B** |
| **ai-agent** | 300 | none | ai.chat.complete | — | useStore | **B** |
| **files** | 209 | none | files.* (6 hooks) | — | useStore | **B** |
| **sharing** | 141 | icon-picker | pages.setShareSlug, setShareIndexable | — | useStore | **B** |
| **wiki** | 187 | icon-picker | features.wiki.* | — | useStore | **B** |
| **comments** | 468 | none | features.comments.* | — | PageCommentsProvider | **B** |
| **library** | 1318 | icon-picker, workspace-io | — | next/navigation | useStore | **B** |
| **workspace-members** | 215 | none | invites.*, workspaces.members | — | useStore | **B** |
| **database-templates** | 253 | none | — | — | useStore | **B** |
| **database-row-selection** | 319 | databases | — | — | RowSelectionProvider + useStore | **B** |
| **database-row** | 282 | databases, editor, comments | — | — | useStore | **C** |
| **database-json** | 1054 | database-csv, icon-picker | — | external Anthropic API | useStore | **C** |
| **admin-panel** | 3457 | icon-picker | 19 admin/* + templates.* + feedback.* | — | — | **C** |
| **workspace-io** | 887 | files | import.zip.importZip | — | WorkspaceIOProvider | **C** |
| **command-palette** | 547 | search, icon-picker, database-presets | — | `/inbox`, `/trash` | useStore | **C** |
| **workspace-sidebar** | 1952 | admin-panel, ai-agent, feedback, icon-picker, inbox, templates, workspace-io, workspace-members | — | `/admin`, `/auth`, `/dashboard`, `/inbox`, `/trash` (5 hardcoded) | useStore + AuthActions | **C** |
| **editor** | 5084 | analytics, backlinks, block-selection, comments, databases, icon-picker, mentions, notifications, sharing, snapshots, wiki, workspace-io (12) | pages.getById, ai.chat.complete | `/share/` | useStore | **C** |
| **databases** | 8249 | database-cell-selection, database-json, database-row, database-row-selection, database-templates, files, icon-picker (7) | databases.* (heavy) | `/trash` | useStore | **C** |

**Hub slice:** `icon-picker` is imported by **42** call sites across
12+ slices. Anything visual pulls it in. Treat as a peer dep, not a
feature — promote to `shared/components/`.

---

## Top portability blockers (ranked)

### 1. Path-alias coupling
Every slice references `@/*` and `@convex/*`. Target project MUST set
both in `tsconfig.json` OR you run a rewrite pass (`@/slices` →
`@/features`, etc.) on every copy.

### 2. `useStore()` is a wide contract (~50 exports)
A slice copy without `StoreProvider` is dead. The store does Page +
Block + Database + Workspace + Recents + Snapshots + Undo all in one
hook — slices import 5–10 functions each. Target project must either
ship the same store or write a 50-method adapter.

### 3. Convex API surface coupling
`api.X.Y` paths are compile-time strings tied to the convex codegen.
- `comments` uses `api["features/comments/queries"]`
- `wiki` uses `api["features/wiki/mutations"]`
- `admin-panel` uses 19 distinct `admin.*` + `templates.*` + `feedback.*` calls
- `databases` uses ~22 mutations/queries

If the target Convex backend doesn't expose the exact module path,
the slice won't even type-check.

### 4. Cross-slice domino chains
- **editor** drags in 12 slices.
- **workspace-sidebar** drags in 8.
- **databases** drags in 7 (its own sub-slices).
- **command-palette** drags in 3 (incl. `database-presets` not even
  audited).

Reality: you can't extract editor without copying half the project.

### 5. Hardcoded route literals
- `workspace-sidebar`: `/admin`, `/auth`, `/dashboard`, `/inbox`,
  `/trash` (5)
- `command-palette`: `/inbox`, `/trash` (CommandPalette.tsx:125–154)
- `databases/DatabaseBlock.tsx:124`: `<Link to="/trash">`
- `editor/EmbedBlock.tsx:30`: `"/share/"` (Loom URL parsing, FALSE
  positive — that's a Loom path, not a Nosion route)

20 total. Anything copy-pasted with these literals locks the target
to Nosion's URL scheme.

### 6. `router-compat` BASENAME hardcode
`frontend/shared/lib/router-compat.tsx:18` — `BASENAME = "/dashboard"`.
Any slice using `useNavigate`/`Link` from router-compat lives under
`/dashboard/*`. New code uses `next/navigation` directly (good); old
slices still on the shim.

Slices still on router-compat: editor, command-palette, mentions,
inbox, workspace-sidebar (mixed), database-row.

### 7. Tailwind brand tokens
`bg-brand`, `text-brand`, `bg-brand/10`, etc. used in 50+ files. Target
project must declare matching CSS variables OR pre-process slices to
swap brand → primary.

### 8. Provider plumbing
- `StoreProvider` — required by almost every slice
- `WorkspaceIOProvider` — required by sidebar / palette / page menu /
  AI agent (not just workspace-io itself)
- `PageCommentsProvider` — required for comments
- `RowSelectionProvider` — required for database views
- `PageHeaderSlotProvider` — required for slices that mount toolbar
  items

Forgetting any of these = runtime crash, not type error.

### 9. Self-hosted Convex schema fragility
Adding a feature usually means schema + helper + mutation + query +
client. Target project's Convex schema MUST include the matching
tables (pages, databases, workspaces, workspaceMembers, userProfiles
at minimum). Schema also has 2-table denorm patterns (rowIds[],
blocks[], properties[]) that diverge from typical apps.

### 10. NPM dep footprint
40+ runtime packages. Anything visual touches:
- All `@radix-ui/*` (15+)
- `@dnd-kit/{core,sortable,modifiers,utilities}` (editor+databases)
- `recharts` (databases chart view)
- `katex` + `highlight.js` (editor block render)
- `jszip` (workspace-io)
- `cmdk`, `vaul`, `sonner`, `lucide-react`, etc.

Target project must install the full set OR the slice won't compile.

---

## The realistic portability model

**Slices are NOT plain folders.** They are a layered ecosystem:

```
┌──────────────────────────────────────────────────────────────┐
│ Slice (frontend/slices/<name>/)                              │
│ ↳ depends on shared primitives + global store + Convex API   │
└──────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│ Frontend infra                                               │
│ - frontend/shared/ui/* (shadcn primitives) — commodity       │
│ - frontend/shared/lib/store + store/ — Nosion-specific       │
│ - frontend/shared/lib/router-compat — Nosion-specific        │
│ - frontend/shared/types/domain — Nosion-specific             │
│ - frontend/shared/components/* — Nosion-specific             │
│ - Tailwind tokens + globals.css                              │
└──────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│ Backend                                                      │
│ - convex/schema.ts — required tables                         │
│ - convex/_shared/* — auth gates, helpers                     │
│ - convex/<feature>.ts — per-feature module                   │
│ - convex/_generated/api — codegen, must match frontend       │
└──────────────────────────────────────────────────────────────┘
```

To make this portable in the "copy a folder, drop it into
features/" sense, you need ONE of these strategies:

### A) Ship as a publishable library (recommended)
Convert this repo into a yarn workspace / monorepo with two packages:
- `@nosion/core` — store + types + UI primitives + tailwind preset
- `@nosion/slices` — feature modules

Target project installs both via `pnpm install` and gets:
- The store contract guaranteed
- The schema as a sharable convex module
- Tailwind preset as a config import

Slice consumers DO copy `convex/<feature>.ts` files into their own
backend, but everything frontend is a versioned dep. This is also the
host-platform path your CLAUDE.md alludes to.

### B) Standardize the slice contract
Make each slice declare its dependencies via a manifest:

```ts
// frontend/slices/comments/index.ts
export const __slice = {
  name: "comments",
  deps: ["icon-picker"],
  convex: ["features.comments.queries.*", "features.comments.mutations.*"],
  providers: ["PageCommentsProvider"],
  schema: ["comments"],  // tables required
  routes: [],
  tailwind: ["brand"],
} as const;
```

A `scripts/copy-slice.ts` script reads the manifest, copies the
folder + its convex modules + its dependency chain. Less elegant
than A) but doesn't require a monorepo.

### C) Refactor slices into "thin slices"
Eliminate cross-slice imports. Move the hub (`icon-picker`) to
`shared/components/`. Replace `useStore()` calls with prop-injected
or context-injected callbacks. Replace hardcoded routes with route
constants (`ROUTES.trash` from `shared/lib/routes.ts`). After this,
each slice is genuinely standalone.

Cost: medium-large refactor; benefit: real drop-in portability.

---

## Concrete action list (ranked by effort × payoff)

### Quick wins (1–2 hours each)

1. **Promote `icon-picker` to `frontend/shared/components/`** — it's
   used by 12 slices, has no slice-internal logic, and being the hub
   it shouldn't live in `slices/`. Removes the implicit dep from
   every visual slice.

2. **Extract route literals** to `frontend/shared/lib/routes.ts`:
   ```ts
   export const ROUTES = {
     dashboard: "/dashboard",
     trash: "/dashboard/trash",
     inbox: "/dashboard/inbox",
     admin: "/dashboard/admin",
     auth: "/auth",
     share: (slug: string) => `/share/${slug}`,
     page: (id: string) => `/dashboard/p/${id}`,
   };
   ```
   Patch the 20 occurrences. Target projects override `ROUTES`.

3. **Add a tailwind preset** at `frontend/shared/tailwind.preset.ts`
   exposing the brand / sidebar / scrollbar tokens. Target projects
   add it to their `tailwind.config.ts`.

4. **Drop `router-compat`** from slices that already use
   `next/navigation` elsewhere — mentions, database-row, command-palette
   should not need the shim. Pin BASENAME = `/dashboard` in one
   helper if you keep it.

### Medium (half day each)

5. **Split `useStore()` into per-domain hooks**:
   `usePages()`, `useDatabases()`, `useWorkspaces()`, `useRecents()`,
   `useHistory()`. Slices import only what they need; target projects
   can stub one domain without re-implementing all 50 methods.

6. **Move `WorkspaceIOProvider` out of `slices/workspace-io`** into
   `shared/providers/`. It's app-wide infra, not a feature.

7. **Promote `database-row*` slices** to a `databases/` namespace —
   they're all internal to the databases experience and shouldn't be
   peer slices.

8. **Stop renaming convex paths** — `comments` lives at
   `features/comments/{queries,mutations}` but `databases` lives at
   `databases.ts` (top-level). Pick ONE convention (preferably
   `features/<name>/`) so the slice → convex mapping is mechanical.

### Larger (1–2 days each)

9. **Manifest + copy-slice script** per strategy B above. Even without
   the strict TS manifest, a `docs/api/<slice>.md` "dependencies"
   section per slice (some already have this) tells a copyer what
   else to drag along.

10. **Monorepo split** per strategy A. Highest payoff, biggest
    upfront; required eventually if you commit to multi-app via
    a host platform.

---

## Recommended "starter pack" for a target project

If a downstream wants pages + databases right now, copy these and
declare these deps:

**Frontend:**
- `frontend/shared/` (entire directory — 500+ files, but everything
  in slices assumes it)
- `frontend/slices/icon-picker/` (visual hub)
- `frontend/slices/editor/` + every slice it depends on (12)
- `frontend/slices/databases/` + every slice it depends on (7)

**Backend:**
- `convex/schema.ts` (entire schema or a strict subset of pages /
  databases / workspaces / workspaceMembers / userProfiles)
- `convex/_shared/`
- `convex/pages.ts`, `convex/databases.ts`, `convex/features/*` for
  the slices imported

**Tailwind:**
- Copy the `@theme inline` block from `app/globals.css`
- Copy the `.prose-editor` + `.scrollbar-thin` utility blocks

**Providers:**
- `StoreProvider`, `WorkspaceIOProvider`, `TooltipProvider`,
  `SidebarProvider`, `PageHeaderSlotProvider`,
  `PageCommentsProvider` (per page)

**Env:**
- `NEXT_PUBLIC_CONVEX_URL`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`

This is "everything except the auth + routing skin" — which is
honestly the only way Nosion is portable today.

---

## Bottom line

The architecture is already feature-sliced. Three things stop it
from being copy-paste portable:

1. **Implicit shared infra** (store, schema, providers, tailwind
   tokens) is not packaged — it's just there, in folders.
2. **Cross-slice imports** create chains. The hub (`icon-picker`)
   isn't promoted to shared.
3. **Convex API paths** are compile-time coupled. Slice A only works
   against backend module B at exact path P.

Fixes are well-defined (see action list). The single highest-leverage
move is **promote `icon-picker` to `shared/` + extract route literals
to `ROUTES` + tailwind preset** — three quick wins that
de-couple ~80% of the visible coupling without touching the data
layer. Then either pursue strategy A (monorepo / library) for the
long term or B (slice manifest) as a stopgap.
