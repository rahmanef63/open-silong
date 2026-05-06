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

export default crons;
