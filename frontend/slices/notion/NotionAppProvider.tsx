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
import type { Block, Database, Page, Property } from "@/shared/types/domain";
import { BlockEditor as DefaultBlockEditor, RowPropertiesPanel as DefaultRowPropertiesPanel } from "@/slices/editor";
import { EditorComponentsProvider } from "@/slices/editor";
import {
  DatabaseBlock as DefaultDatabaseBlock,
  PropertyCell as DefaultPropertyCell,
  DatabasesComponentsProvider,
} from "@/slices/databases";
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

/** Direct context — exported so the `useNotionConfig` hook can read it
 *  without a circular import. Sub-slices should NOT import this; use
 *  `useNotionConfig` instead. */
export const NotionAppContext = Ctx;

export function useNotionConfig(): NotionAppConfig {
  return useContext(Ctx);
}
