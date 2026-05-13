import type { ComponentType } from "react";

/** Module-level registry that breaks the import cycle between
 *  NestedBlock (top-down dispatcher) and recursive container blocks
 *  (ColumnBlockEditor, ToggleContent). NestedBlock writes itself here
 *  on first module load (via a side-effect import in BlockEditor.tsx);
 *  containers read it via `requireNested()` at render time. */
export const nestedRegistry: { Nested?: ComponentType<any> } = {};

/** Resolve the registered NestedBlock with a clear failure mode.
 *  Throws if the registry hasn't been populated — points to the missing
 *  side-effect import rather than surfacing React error #130. */
export function requireNested(): ComponentType<any> {
  if (!nestedRegistry.Nested) {
    throw new Error(
      "nestedRegistry.Nested is unregistered. " +
      "Ensure BlockEditor.tsx (or another root module of the editor) " +
      "has a side-effect import of './blocks/NestedBlock'.",
    );
  }
  return nestedRegistry.Nested;
}
