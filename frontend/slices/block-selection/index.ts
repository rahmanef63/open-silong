export { BlockSelectionProvider, useBlockSelection, useBlockSelectionOptional } from "./components/BlockSelectionProvider";
export { SelectionToolbar } from "./components/SelectionToolbar";
export { SelectionKeyboard } from "./components/SelectionKeyboard";
export { MarqueeOverlay } from "./components/MarqueeOverlay";
export type { SelectionApi, SelectionState } from "./types";

// Lib helpers used by the editor's drag-end handler (peer slice).
export {
  placeTopLevelGroupAtBlock,
  appendTopLevelGroupToContainer,
  topLevelIdsInOrder,
} from "./lib/multiMove";
