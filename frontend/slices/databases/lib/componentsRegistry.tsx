"use client";

/**
 * Databases → peer-slice component registry.
 *
 * Symmetric to `frontend/slices/editor/lib/componentsRegistry.tsx`
 * — lets `RowDetailSheet`, `RowDetailDialog`, `RowDetailBody` accept
 * overridable implementations of peer-slice components (today:
 * `BlockEditor` + `RowPropertiesPanel` from `@/slices/editor`).
 *
 * Render-prop seam introduced 2026-05-21 (Phase 3 of the notion
 * mega-slice lift plan, docs/rr-sync/2026-05-21-notion-mega-lift-plan.md).
 * Resolves the databases ↔ editor bidirectional dependency at the
 * SLICE level so the mega-slice can lift as a self-contained bundle
 * to rr without the cycle.
 *
 * Today (Phase 3): RowDetailSheet/Dialog wire defaults themselves by
 * importing from `@/slices/editor`. Phase 4 moves the default to
 * NotionAppProvider mount-time so the databases slice no longer
 * imports editor at all — full cycle break.
 */

import {
  createContext, useContext, type ComponentType, type ReactNode,
} from "react";
import type { Block, Page } from "@/shared/types/domain";

export interface DatabasesComponentsRegistry {
  /** Block editor — renders one block at a time inside RowDetailBody.
   *  Defaults to `BlockEditor` from `@/slices/editor`. */
  BlockEditor?: ComponentType<{
    pageId: string;
    block: Block;
    index: number;
    total: number;
    registerRef: (id: string, el: HTMLElement | null) => void;
    focusByOffset: (blockId: string, delta: number) => void;
  }>;
  /** Properties panel for a database row. Defaults to
   *  `RowPropertiesPanel` from `@/slices/editor`. */
  RowPropertiesPanel?: ComponentType<{ page: Page }>;
}

const Ctx = createContext<DatabasesComponentsRegistry>({});

export interface DatabasesComponentsProviderProps {
  value: DatabasesComponentsRegistry;
  children: ReactNode;
}

export function DatabasesComponentsProvider({ value, children }: DatabasesComponentsProviderProps) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Always-safe read — returns `{}` if no provider mounted. Sub-components
 *  fall back to their own defaults when a slot is unset. */
export function useDatabasesComponents(): DatabasesComponentsRegistry {
  return useContext(Ctx);
}
