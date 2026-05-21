/** Centralized server-side limits.
 *
 *  Single source of truth for rate-limit budgets, length caps, count
 *  caps, retention windows. Inline numbers are forbidden — change
 *  the budget here and every caller picks it up.
 *
 *  Convention: scope strings follow `<module>.<op>` (`pages.create`,
 *  `comments.create`, etc.) so the `rateLimits` table groups
 *  cleanly per fn.
 */

const DAY_MS = 24 * 60 * 60_000;

// ─── Rate limits (max calls / window) ─────────────────────────────
// Each hot mutation has a TWO-tier limit: per-minute burst (cheap, blocks
// runaway scripts) + per-day total (defense vs slow brute that paces under
// the burst). Both must pass — order doesn't matter since the bucket
// state is per-scope. Daily caps sized at ~10× a heavy human user.
export const RATE_LIMITS = {
  // Page surface
  pagesCreate:       { scope: "pages.create",        max: 60,  windowMs: 60_000 },
  pagesCreateDay:    { scope: "pages.create.day",    max: 800, windowMs: DAY_MS },
  pagesDuplicate:    { scope: "pages.duplicate",     max: 30,  windowMs: 60_000 },
  pagesDuplicateDay: { scope: "pages.duplicate.day", max: 300, windowMs: DAY_MS },
  pagesSetPublic:    { scope: "pages.setPublic",     max: 30,  windowMs: 60_000 },

  // Database surface
  dbCreate:          { scope: "databases.create",    max: 30,   windowMs: 60_000 },
  dbCreateDay:       { scope: "databases.create.day",max: 50,   windowMs: DAY_MS },
  dbAddRow:          { scope: "databases.addRow",    max: 120,  windowMs: 60_000 },
  dbAddRowDay:       { scope: "databases.addRow.day",max: 3_000,windowMs: DAY_MS },

  // Comments
  commentsCreate:    { scope: "comments.create",     max: 30,  windowMs: 60_000 },
  commentsCreateDay: { scope: "comments.create.day", max: 500, windowMs: DAY_MS },

  // Inbox
  inboxCreate:       { scope: "inbox.create",       max: 100, windowMs: 60_000 },

  // Import
  importWorkspace:   { scope: "import.workspace",   max: 3,   windowMs: 60_000 },

  // AI — per-hour CALL burst + per-day CALL ceiling. Token-byte usage
  // is enforced separately via aiQuota.ts (per-user daily token cap).
  aiComplete:        { scope: "ai.complete",         max: 20,  windowMs: 60 * 60_000 },
  aiCompleteDay:     { scope: "ai.complete.day",     max: 100, windowMs: DAY_MS },

  // Admin-only AI surface — generous but capped to prevent runaway
  // catalog fetches / connection tests in tight loops.
  aiAdminTest:       { scope: "ai.admin.test",      max: 60,  windowMs: 60_000 },
  aiAdminCatalog:    { scope: "ai.admin.catalog",   max: 20,  windowMs: 60_000 },

  // Public form submissions — generous but capped per-form-owner. The
  // anonymous submitter is bucketed against the form OWNER's userId
  // (we don't have anonymous IPs in Convex), so 60/min keeps a single
  // form from getting hammered into oblivion regardless of source.
  formsPublicSubmit: { scope: "forms.publicSubmit", max: 60,  windowMs: 60_000 },
} as const;

// ─── Char caps ────────────────────────────────────────────────────
export const CHAR_CAPS = {
  pageTitle:    200,
  commentText:  5_000,
  inboxTitle:   200,
  inboxBody:    4_000,
  searchQuery:  200,
  aiInput:      60_000,
  shareSlugMin: 3,
  shareSlugMax: 60,
} as const;

// ─── Count caps ───────────────────────────────────────────────────
export const COUNT_CAPS = {
  /** Max blocks accepted on a single `pages.update` write. Generous
   *  enough for a long doc; tight enough to block runaway client
   *  bugs that splat the whole workspace into one page. */
  blocksPerPage:        5_000,
  /** Workspace JSON import. */
  importPagesPerFile:   500,
  importDbsPerFile:     50,
  importBlocksPerPage:  2_000,
  /** Comment list page-size. */
  commentsPerPage:      500,
  /** Snapshot retention per page. Oldest dropped on insert (see
   *  `snapshots.create`). Import path skips the cap on purpose so a
   *  round-tripped backup never loses history mid-restore. */
  snapshotsPerPage:     50,
  /** Sitemap cap. */
  sitemapMaxRows:       1_000,
  sitemapScanRows:      2_000,
  /** Search result cap. */
  searchResultMax:      20,
  /** Admin scan cap for `aiUserModelOverrides`. Swap to pagination if you
   *  ever expect more than this many per-user model assignments. */
  aiOverridesScan:      500,
  /** Inbox feed scan cap. We sort by createdAt desc + cap before
   *  applying the workspace filter; a single user is unlikely to have
   *  >300 recent notifications worth showing. Beyond that, pagination
   *  would be the next step. */
  notificationScan:     300,
} as const;

// ─── Time windows ─────────────────────────────────────────────────
export const RETENTION = {
  /** Days a trashed page lives before `purgeStaleTrash` cron deletes
   *  it permanently. */
  trashedPageDays:  30,
  /** ms equivalent for cron handler. */
  get trashedPageMs() { return this.trashedPageDays * 24 * 60 * 60_000; },
} as const;

// ─── File size caps ───────────────────────────────────────────────
export const FILE_SIZES = {
  /** Workspace JSON import. */
  workspaceJsonBytes:  8 * 1024 * 1024,
  /** ZIP archive total. */
  zipTotalBytes:       50 * 1024 * 1024,
  /** Per-text entry inside ZIP. */
  zipTextEntryBytes:   1 * 1024 * 1024,
  /** Per-binary entry inside ZIP. */
  zipBinaryEntryBytes: 25 * 1024 * 1024,
  /** Image upload via UI. */
  imageBytes:          10 * 1024 * 1024,
} as const;

// ─── AI token quota (per-user, per-day) ──────────────────────────
// Cost-attack defense — even when call-rate is under budget, an
// attacker on a heavy model can burn the OpenRouter key. Cap total
// tokens (prompt + completion, summed across all calls in the day).
// Admin can raise the cap globally via env `AI_DAILY_TOKEN_CAP`.
export const AI_QUOTA = {
  /** Hard cap when env var is unset. Tuned so even free-tier abuse
   *  caps at <Rp $0.50/day on cheap models. Power users can be raised
   *  via env. */
  defaultDailyTokens: 200_000,
  /** Env override key — set via `npx convex env set AI_DAILY_TOKEN_CAP 500000`. */
  envKey: "AI_DAILY_TOKEN_CAP",
} as const;

// ─── Slug regex (single source) ───────────────────────────────────
export const SHARE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/;
