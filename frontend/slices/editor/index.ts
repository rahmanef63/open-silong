export { PageEditor } from "./PageEditor";
export type { PageEditorProps, PageEditorComponents } from "./PageEditor";
export { BlockEditor } from "./BlockEditor";
export { PageActionsMenu } from "./PageActionsMenu";
export { RowPropertiesPanel } from "./RowPropertiesPanel";

// Render-prop seam for peer-slice overrides (today: DatabaseBlock).
// Consumers wanting to swap implementations mount this provider above
// PageEditor; otherwise PageEditor's own `components` prop is sufficient.
export {
  EditorComponentsProvider, useEditorComponents,
  type EditorComponentsRegistry, type EditorComponentsProviderProps,
} from "./lib/componentsRegistry";

// Hooks consumed by peer slices (databases row sheet/dialog/body).
export { useFullPage } from "./hooks/useFullPage";

// Public lib surface — re-exported so peer slices don't reach into
// `editor/lib/*` directly (which breaks the slice-isolation contract).
export {
  BLOCK_SPECS, type BlockSpec,
} from "./blockSpecs";
export {
  BLOCK_COLORS, BLOCK_COLOR_KEYS, colorClass, bgColorClass,
  type BlockColorKey,
} from "./lib/colors";
