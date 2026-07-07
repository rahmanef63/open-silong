/**
 * Slice contract for `memory-graph` — v0.1.0.
 *
 * Portable knowledge-graph slice. Reads the pages store + shared graph libs
 * only (no `@convex/_generated`), so it drops into any host that provides the
 * `@/shared/lib/store` `usePages()` surface.
 *
 * NOTE: standalone (no defineSliceContract helper required) — keeps the slice
 * portable across repos.
 */
export const contract = {
  id: "memory-graph",
  version: "0.1.0",
  requires: {
    auth: "convex" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: ["react-force-graph-2d"] as const,
  },
  provides: {
    components: ["GraphPage", "LocalGraphPanel"] as string[],
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
