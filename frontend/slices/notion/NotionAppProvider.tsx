"use client";

/** NotionAppProvider — umbrella provider for the `notion` mega-slice.
 *
 *  Wraps four contexts in one mount:
 *
 *  1. `NotionAppConfig` — static config (routes, labels, roles,
 *     feature flags). Defaults to `DEFAULT_NOTION_CONFIG`.
 *  2. `NotionAdapter` — backend-agnostic data layer (pages, databases,
 *     files + optional ai/presence/etc.). REQUIRED prop.
 *  3. `EditorComponentsRegistry` — peer-slice overrides for the editor
 *     (today: `DatabaseBlock`). Bundled defaults from `@/slices/databases`.
 *  4. `DatabasesComponentsRegistry` — peer-slice overrides for databases
 *     (today: `BlockEditor`, `RowPropertiesPanel`). Bundled defaults
 *     from `@/slices/editor`.
 *
 *  By mounting both componentsRegistry providers HERE, the umbrella
 *  becomes the only place that imports both editor + databases. Each
 *  sub-slice stays peer-slice-clean — they declare the registries they
 *  consume but don't import the peer slice themselves.
 *
 *  Consumer pattern:
 *
 *    import {
 *      NotionAppProvider, useConvexNotionAdapter,
 *    } from "@/slices/notion";
 *    import { useConvexNotionAdapter } from
 *      "@/slices/notion/adapter/convexAdapter";
 *
 *    const adapter = useConvexNotionAdapter();
 *    return (
 *      <NotionAppProvider adapter={adapter} config={{ … }}>
 *        <NotionPage pageId={id} />
 *      </NotionAppProvider>
 *    );
 *
 *  For consumers without a backend, swap `useConvexNotionAdapter` for
 *  `useLocalStorageNotionAdapter` (skeleton today, full impl Phase 4+).
 *
 *  Sub-slices read via:
 *    - `useNotionConfig()` for static config
 *    - `useNotionAdapter()` for data
 *    - `useEditorComponents()` / `useDatabasesComponents()` for peer
 *      overrides
 */

import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Block, Database, Page, Property } from "@/shared/types/domain";
// Import the tiny context providers from their LEAF modules, NOT the slice
// barrels. A static barrel import pulls the whole editor/databases slice
// (BlockEditor, DatabaseBlock, …) into this eager provider chunk, defeating
// the dynamic() splits below — so every dashboard route shipped ~436KB of
// editor+databases in first-load. Leaf imports keep the barrels reachable
// ONLY via the dynamic import()s, cutting ~400KB off /library, /dashboard,
// /inbox, /trash, /admin, /settings first-load. (Deep cross-slice import is
// sanctioned by the componentsRegistry doc comment; runtime tree is identical.)
import { EditorComponentsProvider } from "@/slices/editor/lib/componentsRegistry";
import { DatabasesComponentsProvider } from "@/slices/databases/lib/componentsRegistry";

// Lazy defaults: keep the editor (~9k LOC) and databases (~17k LOC) slices OUT
// of the shared dashboard-layout chunk. They load on demand when a page /
// database view actually renders one (via the registries below) — so
// /library, /inbox, /graph never pull them. The providers above are tiny React
// contexts and stay static. ssr:false — these are interactive client surfaces
// the shell (AuthGuard splash) never server-renders anyway.
const DefaultBlockEditor = dynamic(
  () => import("@/slices/editor").then((m) => ({ default: m.BlockEditor })),
  { ssr: false },
);
const DefaultRowPropertiesPanel = dynamic(
  () => import("@/slices/editor").then((m) => ({ default: m.RowPropertiesPanel })),
  { ssr: false },
);
const DefaultDatabaseBlock = dynamic(
  () => import("@/slices/databases").then((m) => ({ default: m.DatabaseBlock })),
  { ssr: false },
);
const DefaultPropertyCell = dynamic(
  () => import("@/slices/databases").then((m) => ({ default: m.PropertyCell })),
  { ssr: false },
);
import { NotionAdapterProvider } from "./adapter/context";
import type { NotionAdapter } from "./adapter/types";
import {
  DEFAULT_NOTION_CONFIG, mergeNotionConfig,
  type NotionAppConfig,
} from "./lib/config";

const Ctx = createContext<NotionAppConfig>(DEFAULT_NOTION_CONFIG);

/** Per-slot component overrides — consumer can replace any bundled
 *  default (e.g. swap DatabaseBlock for a custom inline renderer). */
export interface NotionAppComponents {
  /** Inline / full-page database renderer (consumed by editor). */
  DatabaseBlock?: ComponentType<{ pageId: string; block: Block }>;
  /** Per-row property cell (consumed by editor's RowPropertiesPanel). */
  PropertyCell?: ComponentType<{
    db: Database;
    prop: Property;
    row: Page;
    compact?: boolean;
  }>;
  /** Block renderer (consumed by databases' RowDetailBody). */
  BlockEditor?: ComponentType<{
    pageId: string;
    block: Block;
    index: number;
    total: number;
    registerRef: (id: string, el: HTMLElement | null) => void;
    focusByOffset: (blockId: string, delta: number) => void;
  }>;
  /** Row-properties panel (consumed by databases' RowDetailBody). */
  RowPropertiesPanel?: ComponentType<{ page: Page }>;
}

export interface NotionAppProviderProps {
  /** Required — backend-agnostic data layer. Use
   *  `useConvexNotionAdapter` for production or
   *  `useLocalStorageNotionAdapter` for demo / no-backend setups. */
  adapter: NotionAdapter;
  /** Partial override — merged onto DEFAULT_NOTION_CONFIG. Anything
   *  not specified falls through to the default. */
  config?: Parameters<typeof mergeNotionConfig>[0];
  /** Optional component overrides — defaults bundle in the editor +
   *  databases components from the same mega-slice. */
  components?: NotionAppComponents;
  children: ReactNode;
}

export function NotionAppProvider({
  adapter, config, components, children,
}: NotionAppProviderProps) {
  const merged = useMemo(() => mergeNotionConfig(config), [config]);
  const editorComponents = useMemo(
    () => ({
      DatabaseBlock: components?.DatabaseBlock ?? DefaultDatabaseBlock,
      PropertyCell: components?.PropertyCell ?? DefaultPropertyCell,
    }),
    [components?.DatabaseBlock, components?.PropertyCell],
  );
  const databasesComponents = useMemo(
    () => ({
      BlockEditor: components?.BlockEditor ?? DefaultBlockEditor,
      RowPropertiesPanel: components?.RowPropertiesPanel ?? DefaultRowPropertiesPanel,
    }),
    [components?.BlockEditor, components?.RowPropertiesPanel],
  );

  return (
    <Ctx.Provider value={merged}>
      <NotionAdapterProvider adapter={adapter}>
        <EditorComponentsProvider value={editorComponents}>
          <DatabasesComponentsProvider value={databasesComponents}>
            {children}
          </DatabasesComponentsProvider>
        </EditorComponentsProvider>
      </NotionAdapterProvider>
    </Ctx.Provider>
  );
}

export function useNotionConfig(): NotionAppConfig {
  return useContext(Ctx);
}
