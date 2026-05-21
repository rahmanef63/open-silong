"use client";

/**
 * NotionAdapterProvider + useNotionAdapter hook.
 *
 * Mount the provider once near the root of any app embedding the
 * `notion` mega-slice. Pass it an implementation of the
 * `NotionAdapter` contract (see `./types.ts`). Sub-slices read via
 * `useNotionAdapter()`.
 *
 *   <NotionAdapterProvider adapter={useConvexNotionAdapter()}>
 *     <NotionPage pageId={...} />
 *   </NotionAdapterProvider>
 *
 * Most consumers will use the umbrella `<NotionAppProvider>` from
 * `../NotionAppProvider` which composes config + adapter into one
 * mount.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { NotionAdapter } from "./types";

const Ctx = createContext<NotionAdapter | null>(null);

export interface NotionAdapterProviderProps {
  adapter: NotionAdapter;
  children: ReactNode;
}

export function NotionAdapterProvider({
  adapter,
  children,
}: NotionAdapterProviderProps) {
  return <Ctx.Provider value={adapter}>{children}</Ctx.Provider>;
}

/** Throws if called outside a NotionAdapterProvider. The thrown
 *  error includes a hint pointing at the mount + docs so a
 *  consumer that forgot to wrap gets a fast diagnosis. */
export function useNotionAdapter(): NotionAdapter {
  const adapter = useContext(Ctx);
  if (!adapter) {
    throw new Error(
      "useNotionAdapter() called outside <NotionAdapterProvider>. " +
        "Mount the provider at your app root — see " +
        "docs/api/notion-adapter.md for the integration example.",
    );
  }
  return adapter;
}

/** Lower-case alias for `useContext(Ctx)` returning `null` instead
 *  of throwing. Use this only in surfaces that need to degrade
 *  gracefully when the slice is rendered outside a provider — e.g.
 *  a storybook story, a fallback skeleton, a test fixture. Regular
 *  sub-slice code should always call `useNotionAdapter()`. */
export function useNotionAdapterOptional(): NotionAdapter | null {
  return useContext(Ctx);
}
