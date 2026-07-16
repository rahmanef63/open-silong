# Memory Graph — Obsidian-style knowledge graph for open-silong

Status: **design / not yet built** · Author: agent study (2026-07-07) · Target: `frontend/slices/memory-graph/` + `convex/features/graph/` + `convex/mcp/`

Goal: give open-silong the three things that make Obsidian feel like Obsidian —
`[[wikilinks]]`, `#tags`, and a **force-directed graph view** (global + local) —
plus a **server-side edge index** so backlinks and the graph are cheap and, above
all, so an **AI agent can use the graph as long-term memory over MCP**.

This spec is grounded in a real read of the codebase; every path below exists.

---

## 1. What open-silong already has (reuse, don't rebuild)

| Capability | Where | Reuse for graph |
|---|---|---|
| Pages with JSON blocks, tree via `parentId` | `convex/schema.ts:70` (`pages`), content = `blocks: v.array(v.any())` | nodes = pages; `parentId` = hierarchy edge |
| Denormalized `searchText` rebuilt on every write | `convex/features/search/lib.ts` `buildSearchText`/`flattenBlocksText` | **exact hook point** — extract edges next to it |
| Block walker | `convex/_shared/blocks.ts` `walkBlocks(blocks, fn)` | the primitive the server extractor rides |
| Inline-mention parse | `convex/_shared/idRemap.ts` `MENTION_RE` = `[label](/p/<id>)` | one of the 3 existing edge signals |
| Client backlinks (per page) | `frontend/slices/backlinks/hooks/useBacklinks.ts` — walks `useStore().pages` | powers the **local** graph + backlinks panel today |
| Client mentions scan | `frontend/slices/mentions/hooks/useMentions.ts` regex `/@([a-z0-9_]+)/g` | unlinked-mention primitive + tag-scan template |
| Full-text search index | `pages.searchText` + `searchIndex('search_content')` + `convex/features/search/queries.ts` | unlinked-mention candidate discovery |
| `@page` typeahead (global listener) | `frontend/slices/editor/components/mention-typeahead/*` trigger `/(?:^|\s)@([\w-]{0,40})$/`, inserts `[Title](/dashboard/p/<id>)` | **clone → WikiLinkTypeahead** trigger `[[` |
| Inline tokenizer + decorator (Slack model) | `frontend/shared/lib/inlineMd.tsx` (read surfaces) + `frontend/slices/editor/lib/inlineDecorator.ts` + `decorate.ts` (editor WYSIWYG) | add `wikilink`+`tag` token **once**, renders everywhere |
| Wiki/verified marker | `pages.wiki` + `convex/features/wiki/` | graph node emphasis (hub weight) |
| MCP: JSON-RPC 2.0 `/mcp`, OAuth2.1+PKCE, `nsn_` tokens, 25 tools | `convex/mcp/jsonrpc.ts` (TOOLS[] + `dispatchTool`), `internal.ts` (userId-gated internalQuery), `http.ts` (bearer→userId) | **add graph tools = 3 edits, zero new transport/auth** |
| Slice scaffolding | `slice.json` / `slice.contract.ts` + `index.ts` barrel convention | new slice plugs in for free |
| Theme CSS vars synced to `:root` | `slices/theme-presets` `ThemeColorSync` + `next-themes` | canvas colors via `getComputedStyle` |

**Gaps (net-new):** no edge/link table, no `[[..]]` syntax, no `#tags`, no
unlinked-mentions server query, no graph route/slice, no force-graph lib, no graph
MCP tools. Everything below builds exactly these.

---

## 2. Obsidian feature-parity matrix

Legend: 🟢 MVP (P0–P1) · 🟡 syntax phase (P2) · 🔵 polish (P3) · ⚪ out of scope

| Obsidian feature | Plan | Phase |
|---|---|---|
| `[[wikilinks]]` with autocomplete | new `[[..]]` token + WikiLinkTypeahead (clone `@` typeahead) | 🟡 P2 |
| `[[link\|alias]]` display alias | token supports `\|alias` | 🟡 P2 |
| Unresolved links → click to create ("ghost" node) | ghost node `ghost:<slug>`, click = create page | 🟡 P2 |
| `#tags`, nested `#a/b` | `#tag` token + `pages.tags[]` denormalized + tag nodes | 🟡 P2 |
| Tag pane (all tags + counts) | `graph.listTags` query + tag list UI | 🟡 P2 |
| Backlinks panel (linked mentions) | server `listBacklinks` (edge table) — upgrades today's client panel | 🟢 P0/P1 |
| Unlinked mentions | `getUnlinkedMentions` via search index | 🔵 P3 |
| Outgoing links panel | server `listOutgoing` (edge table) | 🟢 P1 |
| **Global graph view** (force-directed) | `react-force-graph-2d`, `/dashboard/graph` | 🟢 P1 |
| **Local graph** (per-note ego, depth) | BFS n-hop, panel beside backlinks | 🟢 P1 |
| Graph controls: filters (tags/orphans/attachments), forces (center/repel/link dist), display (arrows, text-fade, node size, link thickness) | `GraphControls` panel; persisted in `preferences` | 🟢 P1 / 🔵 P3 |
| Node size by link count, color groups, hover-highlight neighbors, drag/zoom/pan | force-graph props + theme bridge | 🟢 P1 |
| Search / jump to node | reuse `command-palette`/`search` slices | 🔵 P3 |
| Hover page preview | reuse existing hovercard | 🔵 P3 |
| Aliases (`aliases:` frontmatter) | `pages.aliases[]` + resolver | 🔵 P3 |
| `[[link#heading]]` / `[[link^block]]` | heading/block anchor resolve | 🔵 P3 |
| Canvas, daily notes, graph animation timeline | — | ⚪ out |

---

## 3. Architecture — FE ↔ DB correlation (the SSOT)

One edge taxonomy shared by **DB, frontend, and MCP** so all three agree:

```ts
// the ONE contract — lives in frontend/shared/types + mirrored in convex/_shared/links.ts
type EdgeKind = 'wikilink' | 'page-block' | 'mention' | 'tag';

// node id scheme (stable across FE + server + MCP):
//   page  node id = <pageId>                (Convex Id string)
//   ghost node id = 'ghost:' + slug(title)  (unresolved [[Title]])
//   tag   node id = 'tag:' + tag            (nested tag keeps full path 'a/b')

interface GraphNode { id: string; title: string; icon: string;
  kind: 'page' | 'ghost' | 'tag'; degree: number; hub?: boolean }
interface GraphEdge { source: string; target: string;
  kind: EdgeKind; resolved: boolean; blockId?: string }
type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };
```

Two data paths, one taxonomy — **deliberate**, because of the rr-portability wall
(frontend slices must not import `convex/`):

```
                 ┌─────────────────────── page write (editor / MCP / import) ───────────────────────┐
                 │  pages.update / updateBlock / addBlock / duplicate  +  mcp/internal writes         │
                 ▼                                                                                    │
   convex/_shared/links.ts  extractEdges(blocks) ──► resolve [[Title]]→pageId (by_workspace_titleKey) │
                 │                                                                                    │
                 ├─► delete pageLinks by_source, reinsert rows  (mirrors searchText denorm)           │
                 └─► recompute pages.tags[]  (denormalized, gated by touchesText)                     │
                                                                                                      │
   SERVER path (open-silong only, NOT rr-synced):                                                     │
     convex/features/graph/queries.ts  getGlobalGraph / getLocalGraph / listBacklinks / listByTag     │
     convex/mcp/{jsonrpc,internal}.ts  graph_* tools  ◄── AI agents traverse memory here              │
                                                                                                      │
   CLIENT path (portable slice, reactive, zero server round-trip for the canvas):                     │
     frontend/slices/memory-graph/lib/extractEdges.ts  (mirror of the server regexes — parity test)   │
     hooks/useGraphModel()  reads usePages() ──► builds Graph ──► GraphView (react-force-graph-2d) ────┘
```

Why both: the **canvas** wants a live, reactive, offline-portable model → build it
client-side from the already-in-memory `usePages()` store (like `useBacklinks`
does today; free, rr-portable). The **edge table** exists for what the client can't
do: MCP/server access (no browser store), workspace-scale global graph, and
unlinked-mention diffing. The two extractors share the taxonomy + regexes; a
`test_edge_parity` asserts they produce identical edges on a fixture. `ponytail:`
duplicated regex is the price of the frontend↔convex import wall — one small
shared constants block, kept honest by the parity test.

---

## 4. Data model (Convex) — `convex/schema.ts`

```ts
// NEW table
pageLinks: defineTable({
  workspaceId: v.id('workspaces'),
  sourcePageId: v.id('pages'),
  sourceBlockId: v.string(),
  targetPageId: v.optional(v.id('pages')),   // set when resolved
  targetTitle:  v.optional(v.string()),       // set when unresolved (ghost) or for display
  tag:          v.optional(v.string()),        // set when kind==='tag' (full nested path)
  kind: v.union(v.literal('wikilink'), v.literal('page-block'),
               v.literal('mention'), v.literal('tag')),
  resolved: v.boolean(),
  createdAt: v.number(),
})
  .index('by_source', ['sourcePageId'])            // outgoing links, reindex delete
  .index('by_target', ['targetPageId'])            // backlinks O(1)
  .index('by_workspace_tag', ['workspaceId', 'tag'])   // tag pane / pages-by-tag
  .index('by_workspace_target_title', ['workspaceId', 'targetTitle']), // ghost resolution on new-page create

// pages: ADD two fields
//   tags:     v.optional(v.array(v.string())),   // denormalized, for filter chips + by_tag
//   titleKey: v.optional(v.string()),            // lowercased/normalized title
// pages: ADD one index
//   .index('by_workspace_titleKey', ['workspaceId', 'titleKey'])   // [[Title]] → pageId resolver
//   (phase 3) aliases: v.optional(v.array(v.string()))
```

Migration: `convex/features/graph/migrations.ts backfillLinks` — paginate all
non-trashed pages, run `extractEdges`, populate `pageLinks` + `pages.tags` +
`pages.titleKey`. Idempotent (delete-by-source then insert). Run via
`convex run features/graph/migrations:backfillLinks` after deploy.

Consistency: ghost→page promotion — when a page is created/renamed, look up
`pageLinks.by_workspace_target_title === titleKey` and flip matching rows to
`resolved:true, targetPageId`. When a page is trashed, its incoming rows go back to
ghost. `ponytail: write-time reindex, no cron; add a nightly reconcile cron only if drift shows up.`

All handlers: `args:{v.*}` validators, `requireWorkspaceMember`/`requireOwned`
inside handler, `.withIndex(...).take(CAP)` never bare `.collect()` (CLAUDE.md P0).

---

## 5. Edge extraction — `convex/_shared/links.ts` (pure, tested)

```ts
// walks blocks (reusing walkBlocks), returns raw edges before resolution
export function extractEdges(blocks: unknown): RawEdge[]
// signals, in one pass over block.text / .caption / .tableRows / children / columns:
//   1. block.type==='page' && block.pageId       → { kind:'page-block', targetPageId }
//   2. [label](/dashboard/p/<id>) | legacy /p/<id> (MENTION_RE)  → { kind:'mention', targetPageId }
//   3. [[Title]] | [[Title|alias]]  (WIKILINK_RE)  → { kind:'wikilink', targetTitle }
//   4. #tag  incl nested #a/b  (TAG_RE)            → { kind:'tag', tag }
// defensive: blocks is v.any() — guard missing text, recurse columns[][]/children
```

Regexes (SSOT constants, mirrored client-side):
```
WIKILINK_RE = /\[\[([^\]|#^]+?)(?:\|([^\]]+?))?\]\]/g
TAG_RE      = /(?:^|\s)#([A-Za-z0-9_][A-Za-z0-9_\/-]*)/g
MENTION_RE  = /\[([^\]]+)\]\(\/(?:dashboard\/)?p\/([A-Za-z0-9_-]{4,})\)/g   // widen idRemap to accept /dashboard/p/
```

Call sites (gated by existing `touchesText`/`touchesContent`, beside `buildSearchText`):
`convex/pages.ts` → `update`, `updateBlock`, `addBlock`, `deleteBlock`,
`insertBlocksAfter`, `duplicate`, `appendMarkdown`; `convex/mcp/internal.ts` →
`appendMarkdownAs`, `createPage`, `updatePage`, `setTitleAs`;
`convex/import/workspace.ts` → after id-remap (edges reference remapped ids).

Reindex fn: `reindexPageLinks(ctx, page)` — `extractEdges` → resolve titles via
`by_workspace_titleKey` → delete `pageLinks.by_source(pageId)` → insert → patch
`pages.tags` from tag edges. One helper, called at every site above.

---

## 6. Server queries — `convex/features/graph/{queries,mutations,lib,index}.ts`

Public (slice can call via store adapter) + internal mirrors (MCP), all
workspace/owner gated:

| Fn | Args | Returns |
|---|---|---|
| `getGlobalGraph` | `{ includeTags?, includeGhosts?, includeOrphans?, limit? }` | `Graph` (nodes+edges, degree computed) |
| `getLocalGraph` | `{ pageId, depth: 1..3 }` | BFS ego `Graph` |
| `listBacklinks` | `{ pageId }` | incoming edges + source page meta (`by_target`) |
| `listOutgoing` | `{ pageId }` | outgoing edges (`by_source`), resolved + ghost |
| `listTags` | `{}` | `[{ tag, count }]` (`by_workspace_tag`) |
| `listByTag` | `{ tag }` | pages carrying tag |
| `getUnlinkedMentions` | `{ pageId }` | `searchPages(title)` minus already-linked (P3) |
| `getRelated` | `{ pageId }` | pages sharing tags/neighbors, ranked (P3) |

`lib.ts` = `buildGraphFromEdges(edges, pages)` (degree, hub from `wiki`), `bfs(adj, root, depth)`.

---

## 7. Frontend slice — `frontend/slices/memory-graph/`

Portable (reads `@/shared/lib/store` only — **never** `@convex/_generated`, per the
`wiki`-slice anti-pattern). Ships the trio + manifest.

```
frontend/slices/memory-graph/
  index.ts                      # barrel
  slice.json / slice.contract.ts   # deps.npm: ['react-force-graph-2d']
  hooks/
    useGraphModel.ts            # usePages() → Graph (client extract, memoized, mirrors useBacklinks.walk)
    useLocalGraph.ts            # BFS ego over the model, depth control
    useGraphSettings.ts         # persisted display/force/filter prefs (preferences slice)
  lib/
    extractEdges.ts             # CLIENT mirror of convex/_shared/links regexes (parity-tested)
    forceConfig.ts              # d3-force params ↔ Obsidian sliders
    themeBridge.ts              # getComputedStyle(:root) → {node,link,text,bg}; re-read on theme/preset change
  components/
    GraphView.tsx               # 'use client' + next/dynamic ssr:false react-force-graph-2d (global)
    LocalGraphPanel.tsx         # ego graph, mounts beside BacklinksPanel
    GraphControls.tsx           # Obsidian-style: filters + force sliders + display toggles (shadcn Sheet/Slider/Switch)
    GraphLegend.tsx
  views/
    GraphPage.tsx               # full-page global graph + controls (consumed by app route)
```

Wiring:
- `frontend/shared/lib/routes.ts`: add `graph: '/graph'` to `ROUTES` + `ROUTES_ABS` **first**.
- `app/dashboard/graph/page.tsx`: thin wrapper → `<GraphPage/>` (metadata + default fn), mounts under `DashboardShell`.
- `AppSidebar.tsx` `navItems[]`: add `{ label:'Graph', icon:Network, href: path('/graph') }` — **use the existing `path()`/`next/navigation` convention** there (not the router wrapper) or active-highlight breaks.

Force-graph gotchas (from study):
- `react-force-graph-2d` touches `canvas`/`window` → **must** be `next/dynamic(..., { ssr:false })` inside the slice, not the route (Next 16 SSR-crashes otherwise).
- Canvas can't read Tailwind tokens → `themeBridge` reads `--foreground`/`--muted`/etc via `getComputedStyle`, re-reads on `next-themes`/`ThemeColorSync` change.
- Node paint: size ∝ `degree`, hub (`wiki`) bigger/brighter, ghost dashed/dim, tag node distinct color; hover → highlight 1-hop neighbors + fade rest; click → `useNavigate` to `ROUTES.page(id)` (ghost → create-page flow).

Dependency: `pnpm add react-force-graph-2d` **and** declare in `slice.json` `deps.npm`
(else rr port drops it). Rationale: canvas/2D + built-in d3-force + zoom/pan/drag/hover
as a React component = closest to Obsidian's canvas with least glue, scales to
thousands of nodes; SVG (cytoscape) degrades at scale, WebGL (sigma/pixi) is overkill.
Fallback: `d3-force` + hand-rolled `<canvas>` if bundle size bites.

---

## 8. Editor changes (P2 — the caret-sensitive part, isolated on purpose)

`[[..]]` and `#tags` are the only pieces that touch the WYSIWYG contentEditable, so
they land **after** the graph already works on existing links. Slack-model rule:
**innerText must stay === stored source** or the caret math drifts.

1. `frontend/shared/lib/inlineMd.tsx` `tokenizeInline`: add `wikilink` + `tag` token
   kinds **once** — read surfaces (share/export via `renderInline`) inherit them.
2. `frontend/slices/editor/lib/inlineDecorator.ts` + `decorate.ts`: paint `[[Title]]`
   (link color, brackets dimmed) + `#tag` (pill), preserving innerText length for
   `getCaretOffset`/`setCaretAtOffset`. Exclude code/database/page block types (already excluded set).
3. `WikiLinkTypeahead` = clone `MentionTypeahead`, `TRIGGER_RE=/\[\[([^\]]{0,40})$/`,
   candidates from `useEditorAdapter().pages`, insert `[[Title]]`; mount as sibling in
   `DashboardShell.tsx`. Optional `TagTypeahead` on `#`.
4. Click handling: `[[resolved]]` → navigate; `[[unresolved]]`/ghost → create page with
   that title then relink (Obsidian's signature move).
5. **Collision:** `MARKDOWN_TRIGGERS` keys on whole-block innerText, so a lone `# ` at
   line start converts to h1 — inline `#tag` mid-line is safe, but guard tag-at-line-start
   in the input handler.

---

## 9. MCP tools — memory graph for AI agents (`convex/mcp/`)

Add to **Surface B only** (`convex/mcp/jsonrpc.ts` `TOOLS[]` + `dispatchTool` case +
`convex/mcp/internal.ts` internalQuery). Rides existing `/mcp` endpoint + OAuth/`nsn_`
auth; each tool receives a resolved `userId`. 3 edits per tool, no transport/auth work.

**Read** (`annotations.readOnlyHint: true`):

| Tool | Args | Purpose (LLM-facing) |
|---|---|---|
| `graph_backlinks` | `{ pageId }` | pages linking TO this note |
| `graph_links` | `{ pageId }` | outgoing links (resolved + unresolved) |
| `graph_neighbors` | `{ pageId, depth? }` | local subgraph, n-hop |
| `graph_global` | `{ limit?, includeTags? }` | whole memory graph nodes+edges |
| `graph_tags` | `{}` | all tags + counts |
| `graph_by_tag` | `{ tag }` | notes carrying a tag |
| `graph_unlinked_mentions` | `{ pageId }` | notes that mention this title but don't link it |
| `graph_related` | `{ pageId }` | notes sharing tags/neighbors (recall) |

**Write** — makes the graph a *writable* agent memory (`destructiveHint:false`):

| Tool | Args | Purpose |
|---|---|---|
| `note_create_linked` | `{ title, markdown?, links?: string[], tags?: string[] }` | create a note already wired into the graph |
| `note_link` | `{ fromPageId, to: string, alias? }` | append `[[to]]` into a note (id or title) |
| `note_tag` | `{ pageId, tag }` | add `#tag` to a note |

Internal queries mirror `listPages`/`searchPages`: explicit `userId:v.id('users')`,
inline `doc.userId===userId` gate, ids as `v.string()` (MCP boundary keeps `v.string`),
`.withIndex(...).take(COUNT_CAPS.*)`. **Do not** call `pages.ts`/`requireAuth` (empty
auth ctx on bearer MCP). Reuse `obj()`/`textResult()`/`errResult()`. `graph_by_tag`
uses `pageLinks.by_workspace_tag`; `graph_unlinked_mentions` uses `search_content`.

Notes: only Surface B gets graph tools (Surface A `/mcp/v1` stdio bridge would need 3
edits + drifts; ChatGPT/Claude connect to Surface B over HTTP). OAuth redirect
allowlist is ChatGPT-only today — Claude/others use `nsn_` tokens until widened.

---

## 10. Phased delivery

| Phase | Scope | Touches editor? | Ships value |
|---|---|---|---|
| **P0 Foundation** | `pageLinks` table + `pages.tags`/`titleKey` + `extractEdges` + reindex-on-write + backfill migration + `convex/features/graph` queries + **MCP read tools** | No | Graph data + AI can traverse memory over MCP immediately (on existing `@`/page-block links) |
| **P1 Graph UI** | `memory-graph` slice + `react-force-graph-2d` + `/dashboard/graph` global view + LocalGraphPanel + theme bridge + sidebar nav + settings persistence | No | Visible Obsidian-style global + local graph |
| **P2 Obsidian syntax** | `[[wikilinks]]` + WikiLinkTypeahead + unresolved/ghost + `#tags` + TagTypeahead + tag pane + inline decorator/renderer | **Yes** | Real Obsidian authoring feel |
| **P3 Polish** | MCP write tools + unlinked-mentions UI + aliases + hover preview + `[[#heading]]` refs + graph search/jump | Some | Full parity |

Each phase: `pnpm typecheck` + `pnpm test` (incl. `extractEdges` unit + parity test) →
push to `main` (Convex deploy auto-runs via pre-push hook / `build:auto`).

---

## 11. Risks / decisions

- **Client vs server extractor duplication** — accepted (rr wall). Guarded by parity test. Upgrade path: if drift appears, move regexes to a published `rahman-shared` export both can import.
- **Title-based wikilink resolution** — titles aren't unique. `titleKey` index resolves the unique case; collisions → ghost + disambiguation popover (Obsidian shows a picker). Renames re-resolve via `by_workspace_target_title`.
- **Global-graph scale** — write-time edge table makes reads index-bound, not O(pages×blocks). Backfill + write-time reindex only; add a reconcile cron *if* drift shows.
- **Mention edge fuzziness** — legacy `@title` substring matching can create false edges; new `[[..]]` is id-resolved and preferred. Keep `@` working, nudge toward `[[`.
- **MCP is per-user, not per-workspace** on reads — the graph an agent sees spans all the user's workspaces (matches existing `listPages`). If per-workspace MCP scoping is wanted, that's a separate change to `internal.ts`.

---

## 12. Known follow-ups (deferred to P3)

- **Ghost promotion** — creating/renaming a page does NOT re-resolve other pages' unresolved `[[Title]]` ghost links (needs a slugged `targetTitleKey` field + index on `pageLinks`); re-running `backfillLinks` resolves them in the meantime, and typing `[[Existing]]` already resolves immediately.
- **Share/export wikilink resolution** — `renderInline`'s new `pages` arg is not wired at the `SharedPageView` / template-preview call sites, so wikilinks render as ghost spans on read surfaces.
- **Ghost → create-page click flow** — clicking an unresolved `[[link]]` should create the page; not implemented yet.
- **Client graph model is edge-sparse** — the store loads pages via `listMeta` (no `blocks`), so the pure-client `useGraphModel` sees only hierarchy edges; open-silong relies on the server `getGlobalGraph` / `getLocalGraph` for real link edges. On the pure-client path only the currently-open page's own outgoing links show.
- **Imported pages get no `pageLinks` rows** until `workspaceId` is stamped and `backfillLinks` is re-run.
- **`updateBlock` reindex gate (`TEXT_FIELDS`)** skips reindexing patches that change ONLY `block.pageId` or ONLY `tableRows`.
