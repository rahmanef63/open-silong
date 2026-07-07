/**
 * Centralized route constants — single source of truth for in-app navigation.
 *
 * Slices and shell components import from here instead of writing raw
 * `/dashboard/...` literals. Downstream projects that re-host these slices
 * can override the constants without touching every call site.
 *
 * `BASE` is the dashboard segment prefix used by every authed route. If a
 * consumer mounts the slice tree at a different prefix, change BASE here
 * and the rest follows.
 *
 * NOTE: callers using `@/shared/lib/router`'s `Link`/`useNavigate` pass
 * routes WITHOUT the dashboard prefix (the RouterProvider basename adds
 * it). Callers using `next/navigation` should use the `*Abs` variants
 * below, which include the prefix.
 */

const BASE = "/dashboard";

/** Routes WITHOUT the dashboard prefix — for use with `@/shared/lib/router`. */
export const ROUTES = {
  home: "/",
  auth: "/auth",
  dashboard: "/",
  inbox: "/inbox",
  trash: "/trash",
  admin: "/admin",
  library: "/library",
  graph: "/graph",
  settings: "/settings",
  profile: "/profile",
  page: (id: string) => `/p/${id}`,
  /** Full-page database view. Databases are first-class entities; this
   *  route renders the DB directly without going through a "host page"
   *  that embeds it as a block. The legacy databaseHostFor marker is
   *  deprecated as of 2026-05-12. */
  database: (id: string) => `/db/${id}`,
  share: (id: string) => `/share/${id}`,
  invite: (code: string) => `/invite/${code}`,
} as const;

/** Absolute routes WITH the dashboard prefix — for use with next/navigation. */
export const ROUTES_ABS = {
  home: "/",
  auth: "/auth",
  dashboard: BASE,
  inbox: `${BASE}/inbox`,
  trash: `${BASE}/trash`,
  admin: `${BASE}/admin`,
  library: `${BASE}/library`,
  graph: `${BASE}/graph`,
  settings: `${BASE}/settings`,
  profile: `${BASE}/profile`,
  page: (id: string) => `${BASE}/p/${id}`,
  database: (id: string) => `${BASE}/db/${id}`,
  share: (id: string) => `/share/${id}`,
  invite: (code: string) => `${BASE}/invite/${code}`,
} as const;

export const ROUTE_BASE = BASE;
