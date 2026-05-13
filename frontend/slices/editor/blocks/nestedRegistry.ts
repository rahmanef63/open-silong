import type { ComponentType } from "react";

/** Module-level registry that breaks the import cycle between
 *  NestedBlock (top-down dispatcher) and recursive container blocks
 *  (ColumnBlockEditor, ToggleContent). NestedBlock writes itself here
 *  on first module load; containers read it at render time. */
export const nestedRegistry: { Nested?: ComponentType<any> } = {};
