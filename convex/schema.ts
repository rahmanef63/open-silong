import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  /** Workspace = collaboration boundary. Every user has exactly one
   *  `isPersonal` workspace (auto-created at first auth). Additional
   *  workspaces are user-created via `workspaces.create`. Membership
   *  lives in `workspaceMembers`; `ownerId` is the original creator
   *  (cannot be changed without ownership transfer flow). `userId`
   *  retained as alias of `ownerId` for backward-compat with legacy
   *  rows; new code reads `ownerId`. */
  workspaces: defineTable({
    userId: v.id("users"),                   // legacy alias for ownerId — retained
    ownerId: v.optional(v.id("users")),      // canonical owner (filled by migration + new rows)
    name: v.string(),
    emoji: v.string(),
    slug: v.optional(v.string()),            // url-safe (lowercase, digits, hyphens)
    isPersonal: v.optional(v.boolean()),     // true for the user's auto-created workspace
    createdAt: v.optional(v.number()),
    // Per-workspace theme — applied on workspace activation. User's
    // per-device localStorage override (next-themes "silong-theme" +
    // tweakcn "nosion:theme-preset" keys) wins if explicitly set
    // AFTER activation. Workspace admins set these via Settings →
    // Workspace → Appearance.
    themePresetId: v.optional(v.string()),   // matches a tweakcn registry preset name
    themeMode: v.optional(                   // light / dark / system
      v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_owner", ["ownerId"])
    .index("by_slug", ["slug"]),

  /** Invite codes minted by workspace owners. `code` is a base64url
   *  random secret (24 bytes). Single-use: `accept` patches
   *  `acceptedAt` + `acceptedBy`, after which the row is dead. Owner
   *  can revoke before acceptance via `delete`. Expiry: 14 days from
   *  creation, enforced in `accept`. */
  workspaceInvites: defineTable({
    workspaceId: v.id("workspaces"),
    code: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    invitedBy: v.id("users"),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
    acceptedBy: v.optional(v.id("users")),
  })
    .index("by_code", ["code"])
    .index("by_workspace", ["workspaceId"]),

  /** workspace ↔ user membership ledger. Auto-seeded with role:"owner"
   *  for the workspace owner. Future invites add role:"editor"|"viewer"
   *  rows. `by_user_workspace` lets `requireWorkspaceMember` resolve
   *  in O(1). */
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
    invitedBy: v.optional(v.id("users")),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_user_workspace", ["userId", "workspaceId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  pages: defineTable({
    userId: v.id("users"),
    /** Workspace this page belongs to. Optional during transition —
     *  legacy rows resolve to the owner's personal workspace via the
     *  fallback rule in `requireWorkspaceMember`. */
    workspaceId: v.optional(v.id("workspaces")),
    parentId: v.union(v.id("pages"), v.null()),
    title: v.string(),
    icon: v.string(),
    cover: v.union(
      v.string(),
      v.null(),
      v.object({
        type: v.string(),
        value: v.string(),
        positionY: v.optional(v.number()),
        metadata: v.optional(v.any()),
      }),
    ),
    blocks: v.array(v.any()),
    /** Column-layout definitions. Each layout groups blocks by id
     *  (block.layoutGroup === layout.id). Optional — pages without
     *  columns omit this field entirely. */
    layouts: v.optional(v.array(v.object({
      id: v.string(),
      type: v.literal("columns"),
      count: v.number(),
      widths: v.optional(v.array(v.number())),
    }))),
    favorite: v.boolean(),
    trashed: v.boolean(),
    isPublic: v.optional(v.boolean()),
    rowOfDatabaseId: v.optional(v.id("databases")),
    rowProps: v.optional(v.any()),
    /** Set on host pages whose primary content is a single database
     *  block. Holds the ids of databases this page hosts (today: 1 id;
     *  array shape keeps room for future split-screen multi-db hosts).
     *  Stamped by `databases` "Open as page" and by template-instantiated
     *  database-pages. Lets full-page-DB detection skip walking blocks. */
    databaseHostFor: v.optional(v.array(v.id("databases"))),
    font: v.optional(v.string()),
    smallText: v.optional(v.boolean()),
    fullWidth: v.optional(v.boolean()),
    locked: v.optional(v.boolean()),
    /** Custom share-link slug (lowercase a–z 0–9 -, 3–60 chars).
     *  Optional — defaults to the convex id. Unique per user; the
     *  by_share_slug index lets `/share/<slug>` resolve in O(1). */
    shareSlug: v.optional(v.string()),
    /** Allow search engines to index the public share page. Default false:
     *  the share is reachable but `noindex,nofollow` is emitted. */
    shareIndexable: v.optional(v.boolean()),
    /** Wiki mode — treats this page as the canonical entry for a topic. */
    wiki: v.optional(v.object({
      ownerId: v.id("users"),
      ownerName: v.string(),
      ownerIcon: v.string(),
      verified: v.boolean(),
      verifiedAt: v.optional(v.number()),
    })),
    /** Denormalized title + flattened block text. Updated on every page write
     *  so Convex searchIndex can match body content, not just title. */
    searchText: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_parent", ["workspaceId", "parentId"])
    // Powers `sites.workspaceDirectory` (anon /site/[ws]) — walks only the
    // (workspace, public) bucket instead of scanning the whole workspace.
    .index("by_workspace_public", ["workspaceId", "isPublic"])
    .index("by_share_slug", ["shareSlug"])
    // Powers `pages.listPublicForSitemap` (anon endpoint) without scanning
    // every page doc — walks only the search-indexable bucket. shareIndexable
    // is optional; undefined rows sort outside the `=== true` range.
    .index("by_share_indexable", ["shareIndexable"])
    // Powers the daily trash purge cron without a full table scan.
    // Read: q.eq("trashed", true).lt("updatedAt", cutoff).
    .index("by_trashed_updated", ["trashed", "updatedAt"])
    .searchIndex("search_content", {
      searchField: "searchText",
      filterFields: ["userId", "workspaceId", "trashed"],
    }),

  databases: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    name: v.string(),
    icon: v.string(),
    properties: v.array(v.any()),
    rowIds: v.array(v.id("pages")),
    views: v.array(v.any()),
    activeViewId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    uniqueIdCounter: v.optional(v.number()),
    templates: v.optional(v.array(v.any())),
    defaultTemplateId: v.optional(v.union(v.string(), v.null())),
    subItemsParentPropId: v.optional(v.union(v.string(), v.null())),
    locked: v.optional(v.boolean()),
    trashed: v.optional(v.boolean()),
    /** Denormalized: any view in `views` has `formIsPublic === true`.
     *  Stamped by `databases.update` whenever views is patched. Powers
     *  the `by_has_public_form` index so `convex/forms/public.ts` can
     *  skip the full-table scan when resolving an anonymous form slug. */
    hasPublicForm: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"])
    // Powers the daily trash purge cron. databases.trashed is optional —
    // the (undefined → false) coalescing happens in the cron handler
    // since indexes can't filter on undefined directly.
    .index("by_trashed_updated", ["trashed", "updatedAt"])
    .index("by_has_public_form", ["hasPublicForm"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId", "workspaceId"],
    }),

  preferences: defineTable({
    userId: v.id("users"),
    theme: v.string(),
    sidebarDensity: v.string(),
    defaultPageSort: v.string(),
    editorBehavior: v.string(),
    landingView: v.string(),
    lastOpenedPageId: v.union(v.string(), v.null()),
  }).index("by_user", ["userId"]),

  snapshots: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    pageId: v.id("pages"),
    authorId: v.string(),
    authorName: v.string(),
    takenAt: v.number(),
    title: v.string(),
    icon: v.string(),
    cover: v.union(
      v.string(),
      v.null(),
      v.object({
        type: v.string(),
        value: v.string(),
        positionY: v.optional(v.number()),
        metadata: v.optional(v.any()),
      }),
    ),
    blocks: v.array(v.any()),
    rowProps: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_user_page", ["userId", "pageId"])
    .index("by_workspace_page", ["workspaceId", "pageId"]),

  recents: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    pageIds: v.array(v.id("pages")),
  })
    .index("by_user", ["userId"])
    .index("by_user_workspace", ["userId", "workspaceId"]),

  // === inbox ===
  notifications: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    kind: v.string(),                       // "mention" | "comment" | "share" | "system" | "update"
    title: v.string(),
    body: v.optional(v.string()),
    pageId: v.optional(v.id("pages")),
    blockId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    actorIcon: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),

  // === uploaded files (storage ownership ledger) ===
  files: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    storageId: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_storage", ["storageId"]),

  // === comments ===
  comments: defineTable({
    userId: v.id("users"),                  // author
    /** Workspace owning the parent page. Optional for legacy rows that
     *  predate workspace scoping; new comments always stamp this from
     *  the parent page's `workspaceId`. Defense-in-depth — the primary
     *  authz path is still the parent-page ownership check. */
    workspaceId: v.optional(v.id("workspaces")),
    pageId: v.id("pages"),
    blockId: v.optional(v.string()),        // null = page-level comment
    text: v.string(),
    authorName: v.string(),
    authorIcon: v.string(),
    resolved: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_page", ["pageId"])
    .index("by_block", ["blockId"])
    .index("by_workspace", ["workspaceId"]),

  // === admin: per-user role + bootstrap ===
  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("superadmin"), v.literal("admin"), v.literal("user")),
    createdAt: v.number(),
    /** Updated by `users.touchLastSeen` — debounced ~5 min from the
     *  client. Powers real DAU/WAU/MAU in the admin overview. Optional
     *  so existing rows don't need a backfill. */
    lastSeenAt: v.optional(v.number()),
    /** Last selected workspace — drives `getActiveWorkspaceId`.
     *  Falls back to user's personal workspace when null/missing. */
    activeWorkspaceId: v.optional(v.id("workspaces")),
    /** Epoch ms — last time the user opened their inbox and
     *  acknowledged the latest changelog entry. Pull-model: the
     *  inbox query returns changelog entries published > this. */
    lastReadChangelogAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_lastSeen", ["lastSeenAt"])
    // Powers `admin.claimSuperAdmin` — first-deployer escape hatch checks
    // whether any superadmin already exists without scanning the table.
    .index("by_role", ["role"]),

  /** Versioned release notes published by admins. Pull-model
   *  surfacing in the inbox: each user sees entries with
   *  publishedAt > userProfile.lastReadChangelogAt. */
  changelogEntries: defineTable({
    version: v.string(),
    title: v.string(),
    /** Checklist items shown in the inbox card / detail view. */
    items: v.array(v.object({
      text: v.string(),
      kind: v.optional(v.union(
        v.literal("feature"),
        v.literal("fix"),
        v.literal("improvement"),
        v.literal("breaking"),
      )),
    })),
    /** Long-form body shown when the user opens the entry. */
    body: v.optional(v.string()),
    /** Draft = not visible to users yet. Set publishedAt to surface. */
    publishedAt: v.optional(v.number()),
    publishedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_published", ["publishedAt"])
    .index("by_created", ["createdAt"]),

  /** Outbound webhook endpoints registered per user. Each endpoint
   *  subscribes to a list of event names (e.g. "page.created",
   *  "page.updated"). When a matching event fires, a POST is sent
   *  to `url` with HMAC-SHA256 signature header derived from `secret`.
   *  Auto-dispatch from page/db mutations is wired incrementally —
   *  for v1, manually trigger via `webhooks.deliver` action. */
  webhookEndpoints: defineTable({
    userId: v.id("users"),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.string(),
    enabled: v.boolean(),
    createdAt: v.number(),
    lastSuccessAt: v.optional(v.number()),
    lastErrorAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  /** Append-only audit log of every webhook delivery attempt. Pruned
   *  by `maintenance.pruneWebhookDeliveries` (TBD) after 30 days. */
  webhookDeliveries: defineTable({
    endpointId: v.id("webhookEndpoints"),
    event: v.string(),
    payload: v.any(),
    attemptedAt: v.number(),
    statusCode: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_endpoint", ["endpointId"])
    .index("by_attempted", ["attemptedAt"]),

  /** Read receipts — last time a user viewed a page. Touched by the
   *  client on PageEditor mount, debounced to ~30s. Powers the
   *  "Seen by N" badge in PageHeaderSlot + Notion-style presence
   *  hints in the sidebar. */
  pageViews: defineTable({
    userId: v.id("users"),
    pageId: v.id("pages"),
    lastViewedAt: v.number(),
  })
    .index("by_page", ["pageId"])
    .index("by_page_user", ["pageId", "userId"])
    .index("by_user", ["userId"]),

  // === MCP per-user tokens ===
  mcpTokens: defineTable({
    userId: v.id("users"),
    /** SHA-256 hex of the plaintext token. Lookup uses by_hash; plaintext
     *  is shown to the user only at issue-time. */
    tokenHash: v.string(),
    label: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revoked: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_hash", ["tokenHash"]),

  // === admin: audit log ===
  auditLog: defineTable({
    actorId: v.id("users"),
    actorEmail: v.optional(v.string()),
    kind: v.string(),                       // "role.set" | "feedback.resolve" | "template.upsert" | ...
    target: v.optional(v.string()),         // free-form id of affected entity
    meta: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_actor", ["actorId"]),

  // === feedback inbox / user tickets ===
  // Single table backs both casual feedback (kind=praise/other, no
  // title) and formal tickets (kind=bug/idea with title+priority).
  // Admin reply lives inline so the user-side "My tickets" view can
  // render the back-and-forth without a separate comments table.
  feedbackEntries: defineTable({
    userId: v.id("users"),
    userEmail: v.optional(v.string()),
    kind: v.union(v.literal("bug"), v.literal("idea"), v.literal("praise"), v.literal("other")),
    /** Short title — populated for formal tickets, optional for
     *  casual feedback (legacy rows lack it). */
    title: v.optional(v.string()),
    message: v.string(),
    /** Severity per the user submitting. Admin can override on review. */
    priority: v.optional(v.union(v.literal("low"), v.literal("med"), v.literal("high"))),
    status: v.union(
      v.literal("open"),
      v.literal("in_review"),
      v.literal("resolved"),
      v.literal("closed"),
    ),
    /** Admin response visible to the reporter. Single field instead of
     *  a comments thread — simple enough for the current scale. */
    adminReply: v.optional(v.string()),
    repliedAt: v.optional(v.number()),
    repliedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  // === rate limits — fixed-window counter per (userId, scope) ===
  // Pruned lazily by the helper itself; no cron needed at this scale.
  rateLimits: defineTable({
    userId: v.id("users"),
    scope: v.string(),       // e.g. "comments.create", "ai.complete"
    windowStart: v.number(), // epoch ms truncated to bucket boundary
    count: v.number(),
  })
    .index("by_user_scope", ["userId", "scope"])
    // Powers `maintenance.pruneRateLimits` — daily prune of expired buckets.
    .index("by_window", ["windowStart"]),

  // === page templates (admin-managed JSON blueprints) ===
  pageTemplates: defineTable({
    name: v.string(),
    icon: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    /** Promotional images — first is hero thumb, rest in detail accordion. */
    images: v.optional(v.array(v.string())),
    json: v.any(),                          // TemplateJson — validated server-side on upsert
    createdBy: v.id("users"),
    isPublished: v.boolean(),
    isSeed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_published", ["isPublished"])
    .index("by_category", ["category"])
    .index("by_seed_name", ["isSeed", "name"]),

  /** Singleton row (max 1). Admin-managed system-wide AI config. When
   *  set + enabled, the AI pipeline routes through `provider` + `apiKey`
   *  instead of the env var. Lets admin rotate the OpenRouter key from
   *  the UI without redeploying. Per-user model can be overridden via
   *  `aiUserModelOverrides`; provider + key always come from here. */
  globalAISettings: defineTable({
    provider: v.string(),
    model: v.string(),
    apiKey: v.string(),
    baseUrl: v.optional(v.string()),
    enabled: v.boolean(),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }),

  /** Live progress doc for an in-flight chat.complete run. The action
   *  writes one step per loop hop / tool call; the frontend subscribes
   *  via getProgress(runId) to render a real-time timeline. Doc is
   *  deleted on completion (or aged out by the daily prune cron). */
  aiRunProgress: defineTable({
    userId: v.id("users"),
    runId: v.string(),
    steps: v.array(v.any()),
    updatedAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  /** Per-user AI token usage ledger — bucketed by `dayKey` (floor of
   *  unix ms / 86_400_000). Increments after every `ai.complete` call;
   *  checked before each call to enforce the daily cap defined in
   *  `_shared/limits.ts → AI_QUOTA`. Pruned by the daily maintenance
   *  cron after 30 days. */
  aiTokenUsage: defineTable({
    userId: v.id("users"),
    dayKey: v.number(),
    tokens: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_day", ["userId", "dayKey"])
    .index("by_day", ["dayKey"]),

  /** OAuth 2.1 + PKCE state for ChatGPT custom-app flow.
   *  Spec: RFC 7636 (PKCE) + RFC 8414 (AS metadata) + RFC 9728 (PR metadata).
   *  MCP auth: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
   *  Single-tenant model: only admins can mint codes via `/oauth/authorize`.
   *  The "client" is whoever pasted ChatGPT's connector form — we don't
   *  enforce client_id since user-defined-client mode lets the admin pick. */
  oauthCodes: defineTable({
    code: v.string(),
    codeChallenge: v.string(),
    codeChallengeMethod: v.string(), // "S256" only
    redirectUri: v.string(),
    clientId: v.string(),
    scope: v.optional(v.string()),
    resource: v.optional(v.string()),
    userId: v.id("users"),
    expiresAt: v.number(), // unix ms, 5 min TTL
    consumed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_user_time", ["userId", "createdAt"]),

  /** Long-lived access tokens issued after a successful code exchange.
   *  Validated on every MCP call. 1 year TTL — easy to rotate via revoke. */
  oauthAccessTokens: defineTable({
    token: v.string(),
    userId: v.id("users"),
    clientId: v.string(),
    scope: v.optional(v.string()),
    resource: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    label: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_user_time", ["userId", "createdAt"]),

  /** Admin-set per-user MODEL override. Inherits provider + apiKey from
   *  `globalAISettings` — useful when admin wants a premium user on a
   *  beefier model (e.g. claude-sonnet-4.5) and free-tier users on a
   *  cheaper one (e.g. claude-haiku-4.5), all routed through one key. */
  aiUserModelOverrides: defineTable({
    userId: v.id("users"),
    model: v.string(),
    setBy: v.id("users"),
    updatedAt: v.number(),
    /** Denormalized for the admin list UI so we don't N+1 db.get
     *  every row. Stamped at write; legacy rows without these fields
     *  fall back to a live user lookup. */
    emailAtAssign: v.optional(v.string()),
    nameAtAssign: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_updated", ["updatedAt"]),

  /** Generic per-portal dashboard menu items. Useful for any downstream
   *  app consuming this Convex backend that wants pluggable navigation
   *  per role (owner / staff / guest / …). Edit via the Convex dashboard
   *  table view or via mutations in `convex/zianMenu.ts`. Public read,
   *  no auth gate. */
  zianMenuItems: defineTable({
    portal: v.string(),            // owner | manager | staff | guest | resident | security | admin
    slug: v.string(),              // stable id within portal
    label: v.string(),             // display text
    icon: v.string(),              // lucide-react component name
    route: v.string(),             // absolute path
    order: v.number(),             // sort order ascending
    parentSlug: v.optional(v.string()),  // when set, this row is a child of (portal, parentSlug) — sidebar nests them
    requirePermission: v.optional(v.string()),
    active: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_portal_order", ["portal", "order"])
    .index("by_portal_slug", ["portal", "slug"])
    .index("by_portal_parent", ["portal", "parentSlug"]),

  /** BYOK AI keys — users add their own provider keys to offset
   *  admin AI costs OR use private models. Scope decides visibility:
   *    - "personal" → only `ownerUserId` sees + uses the key
   *    - "workspace" → all members of `workspaceId` can use it;
   *                     only `ownerUserId` (must be workspace admin)
   *                     can edit / delete / re-validate
   *  `encryptedKey` is the `enc:v1:iv:ct` envelope produced by
   *  `_shared/aiCrypto.ts:encryptApiKey` (shared with the existing
   *  globalAISettings admin key path — one crypto helper, one rotation
   *  story). Plaintext is NEVER returned to the client — only `last4`
   *  for display. `enabledModels` lets one key (esp. OpenRouter)
   *  expose multiple models to the AI picker; each entry may be
   *  toggled without re-entering the key. `endpoint` is OpenAI-
   *  compatible base URL override (custom provider). `validatedAt`
   *  is the last successful 1-token test call timestamp. */
  aiUserKeys: defineTable({
    ownerUserId: v.id("users"),
    scope: v.union(v.literal("personal"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),  // required when scope="workspace"
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("google"),
      v.literal("openrouter"),
      v.literal("custom"),
    ),
    label: v.optional(v.string()),                // user-given nickname
    encryptedKey: v.string(),                     // enc:v1:iv:ct envelope
    last4: v.string(),
    endpoint: v.optional(v.string()),
    enabledModels: v.array(v.object({
      id: v.string(),
      label: v.string(),
      enabled: v.boolean(),
    })),
    preferOwn: v.boolean(),                       // personal scope: prefer own over admin
    validatedAt: v.optional(v.number()),
    validatedError: v.optional(v.string()),       // last validation error message
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerUserId"])
    .index("by_workspace_scope", ["workspaceId", "scope"]),

  /** AI usage log — one row per successful AI call. Drives Settings →
   *  AI → Usage tab + Admin → AI Usage panel. `keySource` records
   *  which fallback tier was used:
   *    - "user"      → ownerUserId's personal key
   *    - "workspace" → workspace-scoped key (keyOwnerUserId = creator)
   *    - "admin"     → process.env admin fallback
   *  `costEstimateUsd` is computed at log-time from a hardcoded
   *  pricing table; refreshed quarterly via redeploy. `feature` lets
   *  us break down which surfaces drive cost (chat, summarize, etc).
   *  Indexed for per-user-month and per-workspace-month rollups. */
  aiUsageLog: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    provider: v.string(),
    model: v.string(),
    keySource: v.union(
      v.literal("user"),
      v.literal("workspace"),
      v.literal("admin"),
    ),
    keyId: v.optional(v.id("aiUserKeys")),        // null when source="admin"
    keyOwnerUserId: v.optional(v.id("users")),    // creator of workspace-scope key
    tokensInput: v.number(),
    tokensOutput: v.number(),
    costEstimateUsd: v.number(),
    feature: v.string(),                          // "chat" / "summarize" / "mention" / etc
    durationMs: v.number(),
    timestamp: v.number(),
  })
    .index("by_user_time", ["userId", "timestamp"])
    .index("by_workspace_time", ["workspaceId", "timestamp"])
    .index("by_key", ["keyId"]),
});
