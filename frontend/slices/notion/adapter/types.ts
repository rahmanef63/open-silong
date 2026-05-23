/**
 * NotionAdapter — the single contract editor + databases + templates
 * + workspace-io all talk to. Replaces direct `@convex/_generated/api`
 * calls and direct `@/shared/lib/store` access inside the mega-slice.
 *
 * Lift plan: docs/rr-sync/2026-05-21-notion-mega-lift-plan.md
 * Phase 0 — contract lock (this file).
 *
 * Contract design rules (locked Phase 0, do NOT change without RFC):
 *
 *   1. READS are hooks (`useX`) so each adapter implementation can use
 *      its own reactive primitive (Convex `useQuery`, React Query,
 *      `useSyncExternalStore`, …) without forcing one on the others.
 *      Loading state = `undefined`. "Not found" = `null`. Loaded =
 *      the value.
 *
 *   2. WRITES are async functions returning Promises. Optimistic
 *      updates layer inside the adapter implementation, NOT in the
 *      contract. Errors throw a plain `Error` with a user-safe message
 *      — consumers catch + run through `sanitizeError` from
 *      `@/shared/lib/error`.
 *
 *   3. Ids are `string` at the boundary (matches the boundary-cast
 *      pattern in CLAUDE.md). Adapter implementations cast to branded
 *      `Id<T>` internally.
 *
 *   4. `workspaceId` is explicit on every cross-workspace method. No
 *      implicit "active workspace" coupling inside the adapter
 *      surface — the consumer / Provider resolves the active id
 *      upstream.
 *
 *   5. Optional sub-namespaces (`ai`, `presence`, `search`, `user`,
 *      `snapshots`, `recents`) — consumer may omit. UI surfaces
 *      detect absence (`adapter.ai?.complete ?? undefined`) and
 *      degrade gracefully (hide button, return [], skip UI).
 *
 *   6. Domain types come from `@/shared/types/domain` — adapter never
 *      redefines `Page` / `Database` / `Block` etc. If a field needs
 *      to be added, edit `domain.ts` first.
 *
 * Reference implementations:
 *   - `convexAdapter.tsx` — production, backed by self-hosted Convex.
 *     Skip-listed in rr-sync.json so rr never inherits the Convex
 *     import chain.
 *   - `localStorageAdapter.ts` — demo bucket for rr / template /
 *     portfolio mounts. No backend, single workspace, ~5–10MB
 *     browser quota.
 */

import type {
  Block,
  BlockType,
  CalcKind,
  CoverField,
  Database,
  DatabaseFilter,
  DatabaseSort,
  DatabaseViewConfig,
  DbView,
  Page,
  Property,
  PropertyType,
  PropertyValue,
  SelectOption,
  UserProfile,
  Workspace,
} from "@/shared/types/domain";

import type { FilesAdapter } from "@/slices/files";

// ─── REQUIRED sub-namespaces ────────────────────────────────────────

/** Page CRUD + block-level CRUD inside a page.
 *
 *  Blocks are stored as `page.blocks[]` — these methods exist as
 *  first-class operations because the page document is large and
 *  block mutations are HOT (every keystroke debounces an updateBlock).
 *  Bulk patching the whole page on each keystroke would be wasteful. */
export interface PagesAdapter {
  // Reads
  useList(args: { workspaceId: string; includeTrashed?: boolean }): Page[] | undefined;
  useOne(pageId: string | null | undefined): Page | null | undefined;
  /** Pages whose `parentId === parentPageId` (sidebar tree). */
  useChildren(parentPageId: string | null): Page[] | undefined;

  // Page-level writes
  create(args: {
    workspaceId: string;
    parentId?: string | null;
    title?: string;
    icon?: string;
    init?: Partial<Page>;
  }): Promise<string>;
  update(args: { pageId: string; patch: Partial<Page> }): Promise<void>;
  trash(pageId: string): Promise<void>;
  restore(pageId: string): Promise<void>;
  /** Hard delete — only allowed for already-trashed pages. */
  delete(pageId: string): Promise<void>;
  duplicate(pageId: string): Promise<string>;
  move(args: { pageId: string; newParentId: string | null; newIndex?: number }): Promise<void>;
  toggleFavorite(pageId: string): Promise<void>;

  // Block-level writes (live inside `page.blocks[]` but exposed
  // first-class — see comment on the interface).
  addBlock(args: {
    pageId: string;
    afterIndex: number;
    type: BlockType;
    init?: Partial<Block>;
  }): Promise<string>;
  /** Bulk insert N blocks after the block with id `anchorBlockId`.
   *  Used by paste, AI-generate, slash-template. When `replaceAnchor`
   *  is true, the anchor itself is removed (paste-into-empty-line UX).
   *  Server-side splice so column layouts + nested children stay
   *  internally consistent. Returns the ids of the inserted blocks. */
  insertBlocksAfter(args: {
    pageId: string;
    anchorBlockId: string;
    blocks: Block[];
    replaceAnchor?: boolean;
  }): Promise<string[]>;
  updateBlock(args: { pageId: string; blockId: string; patch: Partial<Block> }): Promise<void>;
  deleteBlock(args: { pageId: string; blockId: string }): Promise<void>;
  duplicateBlock(args: { pageId: string; blockId: string }): Promise<string>;
  /** Reorder ALL blocks on a page. `orderedIds.length` must equal
   *  `page.blocks.length` and be a permutation. */
  reorderBlocks(args: { pageId: string; orderedIds: string[] }): Promise<void>;
  /** Replace a single block in-place (used by view-switch, color, etc.
   *  where the patch shape doesn't fit a simple `Partial<Block>`). */
  replaceBlock(args: { pageId: string; blockId: string; nextBlock: Block }): Promise<void>;
}

/** Database schema + view + row CRUD.
 *
 *  Rows are pages with `rowOfDatabaseId` set — use `PagesAdapter` for
 *  row content CRUD. This namespace only handles database-level shape
 *  (properties, views, ordering) and per-row PROPERTY VALUE writes
 *  (since values live on the database, not the row page). */
export interface DatabasesAdapter {
  // Reads
  useList(args: { workspaceId: string }): Database[] | undefined;
  useOne(dbId: string | null | undefined): Database | null | undefined;
  /** Pages with `rowOfDatabaseId === dbId`, ordered by `db.rowIds`. */
  useRows(dbId: string): Page[] | undefined;

  // Database-level writes
  create(args: {
    workspaceId: string;
    name: string;
    icon?: string;
    init?: Partial<Database>;
  }): Promise<string>;
  update(args: { dbId: string; patch: Partial<Database> }): Promise<void>;
  trash(dbId: string): Promise<void>;
  restore(dbId: string): Promise<void>;
  delete(dbId: string): Promise<void>;

  // Properties (schema-level)
  addProperty(args: { dbId: string; type: PropertyType; name?: string }): Promise<string>;
  /** Clone an existing property in ONE round-trip — copies options /
   *  formula / rollup metadata server-side. A two-step add+update from
   *  the caller would race against stale databaseMap state. */
  duplicateProperty(args: { dbId: string; propId: string }): Promise<string | null>;
  updateProperty(args: { dbId: string; propId: string; patch: Partial<Property> }): Promise<void>;
  deleteProperty(args: { dbId: string; propId: string }): Promise<void>;
  reorderProperties(args: { dbId: string; orderedIds: string[] }): Promise<void>;

  // Select / multi-select options (sub-namespace of property)
  addSelectOption(args: { dbId: string; propId: string; option: SelectOption }): Promise<string>;
  updateSelectOption(args: {
    dbId: string;
    propId: string;
    optionId: string;
    patch: Partial<SelectOption>;
  }): Promise<void>;
  deleteSelectOption(args: { dbId: string; propId: string; optionId: string }): Promise<void>;

  // Views
  /** Accepts a full view config (sans id) so consumers can seed the
   *  view's sorts/filters/search/groupBy/etc in ONE round-trip. Two
   *  sequential addView+updateView calls would race — the second reads
   *  stale state (mid-callback) and clobbers the first's mutation. */
  addView(args: { dbId: string; view: Omit<DatabaseViewConfig, "id"> }): Promise<string>;
  updateView(args: { dbId: string; viewId: string; patch: Partial<DatabaseViewConfig> }): Promise<void>;
  deleteView(args: { dbId: string; viewId: string }): Promise<void>;
  setActiveView(args: { dbId: string; viewId: string }): Promise<void>;

  // Rows
  addRow(args: { dbId: string; init?: Partial<Page> }): Promise<string>;
  deleteRow(args: { dbId: string; rowPageId: string }): Promise<void>;
  reorderRows(args: { dbId: string; orderedIds: string[] }): Promise<void>;
  setRowValue(args: {
    dbId: string;
    rowPageId: string;
    propId: string;
    value: PropertyValue;
  }): Promise<void>;

  // Relation properties — toggle bidirectional inverse on an existing
  // relation property. When `on: true`, an inverse relation prop is
  // created on the target database (named via `name` or auto-derived);
  // when `on: false`, the inverse is removed. Returns the inverse
  // prop id when one is created/exists, otherwise undefined.
  setRelationTwoWay(args: {
    dbId: string;
    propId: string;
    on: boolean;
    name?: string;
  }): Promise<string | undefined>;
}

// ─── OPTIONAL sub-namespaces ────────────────────────────────────────

/** AI completion — rewrite, generate, agentic ops. Omit to disable
 *  every AI-driven button in the editor + databases. */
export interface AiAdapter {
  /** Generic completion. Used by inline-AI shortcut, Ask-AI popover,
   *  selection-toolbar rewrite. Returns the assistant's response as a
   *  single string (already extracted from any richer envelope). */
  complete(args: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    /** Extra system prompt prepended to the messages array on the
     *  backend. Equivalent to prepending a `{role:"system"}` message. */
    system?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string>;
  /** Streaming variant — returns an async iterable of token chunks.
   *  Adapter implementations that don't support streaming may
   *  fall back to a single yield of the full string. */
  completeStream?(args: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    system?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<string>;
}

/** Per-page presence — who else is currently looking at this page.
 *  Omit to hide the SeenByBadge + skip touch on view. */
export interface PresenceAdapter {
  useRecentViewers(pageId: string | null | undefined): Array<{
    userId: string;
    name: string;
    icon?: string;
    lastSeenAt: number;
  }> | undefined;
  touch(pageId: string): Promise<void>;
}

/** Full-text search. Omit to hide search UI / return []. */
export interface SearchAdapter {
  pages(args: { workspaceId: string; query: string; limit?: number }): Promise<Array<{
    pageId: string;
    title: string;
    icon?: string;
    excerpt?: string;
  }>>;
  databases(args: { workspaceId: string; query: string; limit?: number }): Promise<Array<{
    dbId: string;
    name: string;
    icon?: string;
  }>>;
}

/** Identity / user profile. Required for comments, mentions, sharing
 *  attribution. Omit to anonymise (comments authored as "Anonymous"). */
export interface UserAdapter {
  useCurrent(): UserProfile | null | undefined;
  useById(userId: string | null | undefined): UserProfile | null | undefined;
}

/** Workspaces — multi-tenant scope. If omitted, consumer is treated
 *  as a single-workspace setup and every method falls back to a
 *  hard-coded `"default"` workspaceId. */
export interface WorkspacesAdapter {
  useList(): Workspace[] | undefined;
  useActive(): Workspace | null | undefined;
  setActive(workspaceId: string): Promise<void>;
  create(args: { name: string; emoji?: string }): Promise<string>;
}

/** Recents — "last opened" tracker for the library + breadcrumb.
 *  Omit to disable recents UI. */
export interface RecentsAdapter {
  useList(args: { workspaceId: string; limit?: number }): Array<{
    targetType: "page" | "database";
    targetId: string;
    lastVisitedAt: number;
  }> | undefined;
  push(args: { targetType: "page" | "database"; targetId: string }): Promise<void>;
}

/** Snapshots — version history per page. Omit to hide version-history
 *  drawer + skip auto-snapshot on save. */
export interface SnapshotsAdapter {
  useList(pageId: string): Array<{
    id: string;
    createdAt: number;
    blocks: Block[];
    title?: string;
    icon?: string;
  }> | undefined;
  /** Create a snapshot iff content changed since the last one. */
  snapshotIfNeeded(pageId: string): Promise<void>;
  restore(args: { pageId: string; snapshotId: string }): Promise<void>;
}

// ─── The umbrella ───────────────────────────────────────────────────

/** Single object consumers wire into `<NotionAppProvider adapter={...}>`.
 *  Required namespaces: `pages`, `databases`, `files`. Everything else
 *  is opt-in. */
export interface NotionAdapter {
  pages: PagesAdapter;
  databases: DatabasesAdapter;
  files: FilesAdapter;

  // Optional capabilities
  ai?: AiAdapter;
  presence?: PresenceAdapter;
  search?: SearchAdapter;
  user?: UserAdapter;
  workspaces?: WorkspacesAdapter;
  recents?: RecentsAdapter;
  snapshots?: SnapshotsAdapter;
}

// ─── Misc helper types reused by adapter implementations ────────────

/** Calc kind allowlist re-exported so adapter consumers don't have
 *  to import directly from `@/shared/types/domain` if they only need
 *  the calc surface. */
export type { CalcKind, DatabaseFilter, DatabaseSort, CoverField };
