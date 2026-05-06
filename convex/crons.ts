import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/** Prune rateLimits buckets older than 24 h. The fixed-window helper resets
 *  on first call of a new window, but rows for users who churned will sit
 *  forever — this keeps the table small without paging. */
crons.daily(
  "prune-rate-limits",
  { hourUTC: 3, minuteUTC: 0 },
  internal.maintenance.pruneRateLimits,
);

/** Permanently deletes pages soft-deleted > 30 days ago. */
crons.daily(
  "purge-stale-trash",
  { hourUTC: 3, minuteUTC: 30 },
  internal.maintenance.purgeStaleTrash,
);

export default crons;
