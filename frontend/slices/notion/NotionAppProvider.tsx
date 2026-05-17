"use client";

/** NotionAppProvider — React context that ships `NotionAppConfig` to
 *  every sub-slice (editor, databases, templates, workspace-io, …).
 *
 *  Consumers (other rr-resource projects) mount once near the root:
 *
 *    <NotionAppProvider config={{ routes: { basePath: "/notes" } }}>
 *      <NotionPage pageId={id} />
 *    </NotionAppProvider>
 *
 *  When omitted, defaults match Nosion's own routes/labels — Nosion
 *  itself doesn't need to mount the provider (every read falls through
 *  to `DEFAULT_NOTION_CONFIG`).
 *
 *  Sub-slices read via `useNotionConfig()` from `./lib/useNotionConfig`. */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  DEFAULT_NOTION_CONFIG, mergeNotionConfig,
  type NotionAppConfig,
} from "./lib/config";

const Ctx = createContext<NotionAppConfig>(DEFAULT_NOTION_CONFIG);

export interface NotionAppProviderProps {
  /** Partial override — merged onto DEFAULT_NOTION_CONFIG. Anything
   *  not specified falls through to the default. */
  config?: Parameters<typeof mergeNotionConfig>[0];
  children: ReactNode;
}

export function NotionAppProvider({ config, children }: NotionAppProviderProps) {
  const merged = useMemo(() => mergeNotionConfig(config), [config]);
  return <Ctx.Provider value={merged}>{children}</Ctx.Provider>;
}

/** Direct context — exported so the `useNotionConfig` hook can read it
 *  without a circular import. Sub-slices should NOT import this; use
 *  `useNotionConfig` instead. */
export const NotionAppContext = Ctx;

export function useNotionConfig(): NotionAppConfig {
  return useContext(Ctx);
}
