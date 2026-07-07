/** memory-graph — Obsidian-style knowledge graph (global + local ego) built
 *  client-side from the pages store. Portable: reads `@/shared/lib/store` +
 *  `@/shared/lib/graphLinks` only; never `@convex/_generated`.
 *
 *  Barrel = the slice contract. Consume these; never reach into subpaths.
 */

// Views (route body)
export { GraphPage } from "./views/GraphPage";

// Components
export { GraphView } from "./components/GraphView";
export type { GraphViewProps } from "./components/GraphView";
export { LocalGraphPanel } from "./components/LocalGraphPanel";
export { GraphControls } from "./components/GraphControls";
export type { GraphControlsProps } from "./components/GraphControls";
export { GraphCanvas } from "./components/GraphCanvasLazy";
export type { GraphCanvasProps } from "./components/GraphCanvas";

// Hooks
export { useGraphModel, buildGraphFromPages, filterGraph, ghostNodeId, tagNodeId } from "./hooks/useGraphModel";
export { useLocalGraph, egoGraph, buildAdjacency, bfs } from "./hooks/useLocalGraph";

// Lib
export {
  DEFAULT_FILTER,
  DEFAULT_FORCE,
  DEFAULT_DISPLAY,
  LOCAL_FORCE,
  LOCAL_DISPLAY,
  FORCE_BOUNDS,
  DISPLAY_BOUNDS,
  type FilterConfig,
  type ForceConfig,
  type DisplayConfig,
} from "./lib/forceConfig";
export { useGraphTheme, readGraphTheme, withAlpha, type GraphTheme } from "./lib/themeBridge";
