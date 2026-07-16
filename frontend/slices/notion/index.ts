/** notion — kitab mega-slice.
 *
 *  Single public-API surface for consumers who want the full Nosion
 *  experience (block editor + Notion-style databases + templates +
 *  export/import + sharing + comments + …) as one drop-in.
 *
 *  Recommended consumer pattern:
 *
 *    import {
 *      NotionAppProvider, NotionPage, NotionDatabase, NotionSidebar,
 *    } from "@/slices/notion";
 *
 *    <NotionAppProvider adapter={adapter}>
 *      <NotionSidebar pages={pages} onSelect={...} />
 *      <NotionPage pageId={openId} />
 *    </NotionAppProvider>
 *
 *  Sub-slices (editor, databases, templates, workspace-io, comments,
 *  notifications, mentions, snapshots, sharing, wiki, trash, inbox,
 *  command-palette, ai-agent, search, files, library, icon-picker,
 *  database-csv, database-json, …) ship together via this barrel.
 *  Each one is still individually consumable via its own slice path
 *  if a project only wants part of the experience. */

// ─── Umbrella provider (composes the adapter + editor/databases
//     component registries into one mount). Wrap the wrappers below.
export { NotionAppProvider } from "./NotionAppProvider";
export type { NotionAppProviderProps } from "./NotionAppProvider";

// ─── Portable wrappers (pure / props-driven). These already live under
//     shared/components/notion/; the mega-slice re-exports them so
//     consumers have a single import path.
export {
  NotionHeader, NotionSidebar, NotionPage,
  NotionBlock, NotionDatabase, NotionProperty,
  type NotionHeaderProps, type NotionSidebarProps, type NotionSidebarPage,
  type NotionPageProps, type NotionBlockProps,
  type NotionDatabaseProps, type NotionPropertyProps,
} from "@/shared/components/notion";

// ─── Adapter contract (backend-agnostic data layer). Required mount:
//     wrap the wrappers above in `<NotionAdapterProvider adapter={...}>`
//     or use the umbrella `<NotionAppProvider adapter={...}>` which
//     composes config + adapter into one mount. Reference impls below.
//     Full contract docs: `docs/api/notion-adapter.md`.
export {
  NotionAdapterProvider, useNotionAdapter, useNotionAdapterOptional,
  type NotionAdapterProviderProps,
} from "./adapter/context";
export type {
  NotionAdapter, PagesAdapter, DatabasesAdapter,
  AiAdapter, PresenceAdapter, SearchAdapter, UserAdapter,
  WorkspacesAdapter, RecentsAdapter, SnapshotsAdapter,
} from "./adapter/types";

// ─── Reference adapter implementation. `useConvexNotionAdapter` is the
//     production adapter; import it directly from the file path:
//     `@/slices/notion/adapter/convexAdapter`.
