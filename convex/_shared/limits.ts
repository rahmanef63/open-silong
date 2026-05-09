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

// ─── Rate limits (max calls / window) ─────────────────────────────
export const RATE_LIMITS = {
  // Page surface
  pagesCreate:       { scope: "pages.create",       max: 60,  windowMs: 60_000 },
  pagesDuplicate:    { scope: "pages.duplicate",    max: 30,  windowMs: 60_000 },
  pagesSetPublic:    { scope: "pages.setPublic",    max: 30,  windowMs: 60_000 },

  // Database surface
  dbCreate:          { scope: "databases.create",   max: 30,  windowMs: 60_000 },
  dbAddRow:          { scope: "databases.addRow",   max: 120, windowMs: 60_000 },

  // Comments
  commentsCreate:    { scope: "comments.create",    max: 30,  windowMs: 60_000 },

  // Inbox
  inboxCreate:       { scope: "inbox.create",       max: 100, windowMs: 60_000 },

  // Import
  importWorkspace:   { scope: "import.workspace",   max: 3,   windowMs: 60_000 },

  // AI (per-hour)
  aiComplete:        { scope: "ai.complete",        max: 20,  windowMs: 60 * 60_000 },

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
  /** Snapshot retention per page (oldest dropped — TODO when implemented). */
  snapshotsPerPage:     50,
  /** Sitemap cap. */
  sitemapMaxRows:       1_000,
  sitemapScanRows:      2_000,
  /** Search result cap. */
  searchResultMax:      20,
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

// ─── Slug regex (single source) ───────────────────────────────────
export const SHARE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/;
