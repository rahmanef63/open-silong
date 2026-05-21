"use client";

/**
 * Editor → peer-slice component registry.
 *
 * Render-prop seam introduced 2026-05-21 (Phase 2 of the notion
 * mega-slice lift plan, docs/rr-sync/2026-05-21-notion-mega-lift-plan.md).
 * Lets PageEditor + BlockEditor accept overridable implementations of
 * peer-slice components (today: `DatabaseBlock` from
 * `@/slices/databases`) so the editor slice can be lifted into rr
 * without dragging the databases slice along.
 *
 * Usage from a consumer (e.g. NotionAppProvider in Phase 4):
 *
 *   import { EditorComponentsProvider } from "@/slices/editor/lib/componentsRegistry";
 *   import { DatabaseBlock } from "@/slices/databases";
 *
 *   <EditorComponentsProvider value={{ DatabaseBlock }}>
 *     <PageEditor ... />
 *   </EditorComponentsProvider>
 *
 * Today (Phase 2): PageEditor wires the default itself by passing
 * `DatabaseBlock` from the bundled databases slice. Phase 4 moves
 * this wiring up into NotionAppProvider so the editor slice no
 * longer imports databases as a default — full cycle break.
 */

import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import type { Block } from "@/shared/types/domain";

export interface EditorComponentsRegistry {
  /** Inline / full-page database renderer. */
  DatabaseBlock?: ComponentType<{ pageId: string; block: Block }>;
}

const Ctx = createContext<EditorComponentsRegistry>({});

export interface EditorComponentsProviderProps {
  value: EditorComponentsRegistry;
  children: ReactNode;
}

export function EditorComponentsProvider({ value, children }: EditorComponentsProviderProps) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Always-safe read — returns `{}` if no provider mounted. Sub-components
 *  fall back to their own defaults when a slot is unset. */
export function useEditorComponents(): EditorComponentsRegistry {
  return useContext(Ctx);
}
