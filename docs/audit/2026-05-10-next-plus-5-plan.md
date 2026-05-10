# Next +5 plan — 2026-05-10

State after commit `a13ae7a` (2026-05-09): **~67/100**. Target this
cycle: **~72/100** via 5 features that ship in one session each.

This doc plans the next batch. Each card lists scope, blast radius,
implementation sketch, and the rough effort window so the executing
agent can pick whether to do all 5 or carve a subset.

---

## Recommended 5 — balanced session (~3–4 hours total)

These five together push the score by ~5 and have small blast radius.
Picked deliberately to avoid blocking on a single big-bet feature.

### A. Inline "Ask AI" in block menu  · effort M  · gain +1.5

**Why now**: Notion's ⌘J is the most-requested AI affordance. We
already have the ai-agent slice + selection toolbar AI. Block-level
inline menu is the missing surface.

**Scope**:
- New block-menu item "Ask AI" (above the Color row)
- Opens a small input popover anchored to the block
- 4 quick presets: summarise this page · explain this block ·
  continue writing · brainstorm
- Streams via existing `api.ai.chat.complete` action; appends result
  as a new paragraph block below the trigger
- ⌘J keyboard shortcut from inside any block

**Files**:
- `frontend/slices/editor/blocks/AskAIPopover.tsx` (new)
- `frontend/slices/editor/blocks/BlockControls.tsx` (add Sparkles row)
- `frontend/slices/editor/BlockEditor.tsx` (⌘J shortcut)
- `convex/ai/internal.ts` may need a `summarisePage` helper that
  fetches block text by pageId

**Risk**: ai.complete already has rate-limit (20/h). Streaming edge
cases on slow networks; show pending spinner.

**Test**: pure prompt-builder helper; UI manual.

---

### B. Per-user MCP tokens · effort M · gain +1

**Why now**: today MCP uses a single env-baked `MCP_API_TOKEN` +
`MCP_USER_ID`. Per-user tokens unlock multi-tenant MCP access,
revocable from the admin panel.

**Scope**:
- Schema: new `mcpTokens` table — `{userId, tokenHash, label,
  createdAt, lastUsedAt, revoked}` + `by_hash` index
- Mutations: `mcp.tokens.issue({label})` returns plaintext once,
  stores hash; `mcp.tokens.revoke({tokenId})`; query `listMine`
- HTTP layer: `convex/mcp/http.ts` accepts `Authorization: Bearer
  <token>` — looks up by hash, sets `userId` for the request,
  updates `lastUsedAt`. Falls back to env token for back-compat.
- Settings UI: new "MCP tokens" section in `/dashboard/settings`
  with issue/copy/revoke flow + last-used timestamps

**Files**:
- `convex/schema.ts` (mcpTokens table + index)
- `convex/mcp/tokens.ts` (new — issue/revoke/listMine + sha256)
- `convex/mcp/http.ts` (lookup-by-hash branch)
- `app/dashboard/(account)/settings/McpTokensSection.tsx` (new)
- `app/dashboard/(account)/settings/page.tsx` (mount section)

**Risk**: hash with sha256 from web crypto on the server (Convex
runtime). Plaintext shown once — clear UX warning.

**Test**: pure hash helper unit test.

---

### C. Linked database picker · effort M · gain +1

**Why now**: Today users can only insert a database block as a NEW
empty db. Notion lets you "link" an existing database to embed it
elsewhere. We already store every db as a top-level entity, so the
plumbing exists — only UI is missing.

**Scope**:
- In slash menu when typing `/database`, show two items:
  "Database — new" (existing) and "Database — linked"
- "Linked" opens a small picker popover listing `useStore().databases`
  (filterable). Picking one inserts a `database` block with
  `databaseId` set.
- Visual hint on linked DB header: small "linked" pill

**Files**:
- `frontend/slices/editor/SlashMenu.tsx` (add second item)
- `frontend/slices/editor/blocks/DatabasePicker.tsx` (new — fuzzy list)
- `frontend/slices/databases/DatabaseBlock.tsx` (linked pill when
  parent's only-block heuristic doesn't match — i.e. embedded
  somewhere else)

**Risk**: deletion semantics — deleting a linked database from one
page must NOT trash the database itself. Already correct: `deleteBlock`
only removes the block, db lives on. Verify and document.

**Test**: pure pickRanking helper.

---

### D. Calendar drag-to-move · effort M · gain +1

**Why now**: Calendar view exists but rows are click-only. Dragging
an event to another day is the single biggest missing UX of the
calendar.

**Scope**:
- HTML5 drag-and-drop on each event card (no DnD-Kit — too heavy
  for this)
- `dragstart` stashes rowId; cell `dragover` highlights; `drop`
  patches `rowProps[calendarDateProp]` to the cell's date
- Touch fallback: long-press → date-picker dialog (mobile)

**Files**:
- `frontend/slices/databases/views/CalendarView.tsx` (drag handlers)
- `frontend/slices/databases/lib/calendarDrag.ts` (pure helpers:
  formatDateValue, parseExistingDate)

**Risk**: date-property shape varies (string vs `{date, time}` object
vs ISO). Use existing `valueFromString` to normalise.

**Test**: pure helpers — date round-trip, drag-target validation.

---

### E. Adopt hooks in remaining dialogs + sweep · effort S · gain +0.5

**Why now**: tier-2 cleanup. Three dialogs are now using
useAsyncError; finish the rest so the codebase converges.

**Scope**:
- `WorkspaceIODialog` (3 tabs × similar pattern) → useAsyncError +
  TabbedDialog primitive
- `TemplateGalleryDialog` → useAsyncError
- `AIGenerateDialog` → useAsyncError
- `ShareDialog` indexable handler still uses inline reportError —
  refactor that branch too (left over from #4 of last cycle)

**Files**:
- `frontend/slices/workspace-io/components/WorkspaceIODialog.tsx`
- `frontend/slices/templates/components/TemplateGalleryDialog.tsx`
- `frontend/slices/admin-panel/components/AIGenerateDialog.tsx`
- `frontend/slices/sharing/components/ShareDialog.tsx`

**Risk**: low. Mechanical refactor. Run typecheck after each file.

**Test**: existing tests cover behaviour; no new tests required.

---

## Alternative: single big-bet · per-page collaborator permissions

If the user wants ONE substantial feature instead of five small ones,
**per-page collaborator permissions** is the highest-value single
target (~+5 alone, multi-workspace blocker prep).

**Scope**:
- Schema: new `pageGrants` table — `{pageId, userId, level: "view" |
  "comment" | "edit", grantedBy, createdAt}`
- All page queries filter via `requireOwnedOrGranted(pageId)`
- ShareDialog gains a "People with access" tab where the owner can
  search users by email and assign a level
- Sidebar shows "Shared with me" section for pages the user has
  any grant on
- Frontend store hydrates grants alongside pages

**Effort**: 6–8 hours. Spans editor, sidebar, sharing, store, schema.
Likely a 2-session lift. Not recommended for a single +5 batch.

---

## What would push the score past 80

Multi-workspace (#4) gates everything else. Until users can have
more than one workspace, "collaboration" features are theatre.
Roadmap to 80:

1. **Multi-workspace** (this would have been here regardless): 5
   sessions if done well — schema split, workspace switcher with
   real switching, invite flow, per-workspace settings.
2. **Per-page collaborator permissions**: 2 sessions.
3. **Real-time presence cursors** (no edit collab — too heavy):
   1 session via Convex's reactive store + a presence map.
4. **Inline AI** + **MCP tokens** + remaining polish: 2 sessions.

Total: ~10 focused sessions to 80/100. The 90 mark requires real-time
collaborative editing (ProseMirror/Yjs rebuild) — a separate
4–6 week project.

---

## Order-of-execution recommendation

Run the recommended 5 (A → E) in order. A and B touch new surfaces;
C and D touch the editor/databases hub but with surgical scope; E
is mechanical cleanup that can fail safely (typecheck catches it).

Validation after each: `npx vitest run && npx tsc --noEmit`. Commit
per feature so the deploy log is readable. Single push at the end.
