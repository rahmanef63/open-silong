export { PageEditor } from "./PageEditor";
export { BlockEditor } from "./BlockEditor";
export { PageActionsMenu } from "./PageActionsMenu";
export { RowPropertiesPanel } from "./RowPropertiesPanel";

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
