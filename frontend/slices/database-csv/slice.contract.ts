/**
 * Slice contract for `database-csv` — v0.1.0.
 *
 * Auto-generated stub. Fill in `provides.components` and refine
 * `requires.rbac` / `requires.env` once the public API is stable.
 *
 * NOTE: standalone (no defineSliceContract helper required) — keeps
 * the slice portable across repos.
 */
export const contract = {
  id: "database-csv",
  version: "0.1.0",
  requires: {
    auth: "convex" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: ["databases"] as const,
  },
  provides: {
    components: [] as string[],
  },
  conflicts: [] as string[],
  bidir: {
    syncPolicy: "manual" as const,
    generalization: {
      level: "portable" as const,
      forbiddenTerms: ["rahmanef", "rahmanef.com"] as string[],
      requiredProps: [] as string[],
    },
  },
} as const;
