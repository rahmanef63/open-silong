/** NotionAppConfig — single configuration surface for consumers of the
 *  `notion` mega-slice (kitab UP-sync target).
 *
 *  Why a config object instead of dozens of props on every wrapper:
 *  - Sub-slices (editor / databases / templates / workspace-io / ...)
 *    each need a handful of values that are project-specific (URL base,
 *    role strings, table names, locale labels).
 *  - Passing them down via React context lets every nested wrapper read
 *    them without prop-drilling.
 *  - Consumer projects override exactly the keys they care about; the
 *    rest fall through to `DEFAULT_NOTION_CONFIG` which matches Nosion's
 *    own conventions.
 *
 *  Generalization gate: this file MUST stay free of project-specific
 *  values. Defaults can be sensible but cannot quote a Nosion-only
 *  brand string, role enum, or URL fragment as truth. */

export interface NotionAppRoutes {
  /** Root segment for all in-app routes. Default: "/dashboard". */
  basePath: string;
  /** (id) => path-to-page. Receives the page id, returns the route. */
  page: (id: string) => string;
  /** (id) => path-to-database (full-page view). */
  database: (id: string) => string;
  /** Static destinations — projects can re-label them. */
  trash: string;
  settings: string;
  inbox: string;
  library: string;
  admin: string;
}

export interface NotionAppRoles {
  /** Role string stored in `workspaceMembers.role` and returned by
   *  permission helpers. Defaults match Nosion's @convex-dev/auth +
   *  workspace-members scheme. */
  owner: string;
  editor: string;
  viewer: string;
  /** Optional moderator tier; consumers without this concept can leave
   *  the default and never reference it. */
  moderator: string;
  /** Top-level admin. */
  superAdmin: string;
}

export interface NotionAppFeatures {
  /** AI chat / inline AI / templates-from-prompt. */
  ai: boolean;
  /** Per-page version history (snapshot bell). */
  snapshots: boolean;
  /** Inline + side-panel comments. */
  comments: boolean;
  /** Public share + slug routing. */
  sharing: boolean;
  /** Template gallery in slash menu + sidebar. */
  templates: boolean;
  /** Notion-compatible MD/HTML/CSV/ZIP export. */
  export: boolean;
  /** Wiki toggle + verify-by-owner badges. */
  wiki: boolean;
}

export interface NotionAppI18n {
  untitledPage: string;
  untitledDatabase: string;
  /** Label shown in the kabab "Move to Trash" action. */
  moveToTrash: string;
  /** Empty-state when a database has 0 rows. */
  noRowsYet: string;
}

export interface NotionAppConfig {
  routes: NotionAppRoutes;
  roles: NotionAppRoles;
  features: NotionAppFeatures;
  i18n: NotionAppI18n;
}

/** Defaults that mirror Nosion's own layout. A consumer who never
 *  passes a config gets behavior identical to the upstream app. */
export const DEFAULT_NOTION_CONFIG: NotionAppConfig = {
  routes: {
    basePath: "/dashboard",
    page: (id) => `/dashboard/p/${id}`,
    database: (id) => `/dashboard/db/${id}`,
    trash: "/dashboard/trash",
    settings: "/dashboard/settings",
    inbox: "/dashboard/inbox",
    library: "/dashboard/library",
    admin: "/dashboard/admin",
  },
  roles: {
    owner: "owner",
    editor: "editor",
    viewer: "viewer",
    moderator: "moderator",
    superAdmin: "super-admin",
  },
  features: {
    ai: true,
    snapshots: true,
    comments: true,
    sharing: true,
    templates: true,
    export: true,
    wiki: true,
  },
  i18n: {
    untitledPage: "Untitled",
    untitledDatabase: "Untitled database",
    moveToTrash: "Move to Trash",
    noRowsYet: "No rows yet",
  },
};

/** Deep-merge a partial override onto the defaults — saves consumers
 *  from having to spread every nested object themselves. */
export function mergeNotionConfig(override?: DeepPartial<NotionAppConfig>): NotionAppConfig {
  if (!override) return DEFAULT_NOTION_CONFIG;
  return {
    routes: { ...DEFAULT_NOTION_CONFIG.routes, ...(override.routes ?? {}) } as NotionAppRoutes,
    roles: { ...DEFAULT_NOTION_CONFIG.roles, ...(override.roles ?? {}) } as NotionAppRoles,
    features: { ...DEFAULT_NOTION_CONFIG.features, ...(override.features ?? {}) } as NotionAppFeatures,
    i18n: { ...DEFAULT_NOTION_CONFIG.i18n, ...(override.i18n ?? {}) } as NotionAppI18n,
  };
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
