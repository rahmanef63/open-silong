/** d3-force parameters ↔ Obsidian-style graph controls.
 *
 *  Three plain config records the UI sliders/switches drive and the
 *  `GraphCanvas` maps onto react-force-graph-2d props + `d3Force(...)` calls.
 *  Pure data — no React, no convex — so the slice stays portable.
 */

/** Physics — mapped to the built-in `charge` / `link` / `center` forces. */
export interface ForceConfig {
  /** Pull toward the graph centre (`forceCenter().strength`), 0..1. */
  centerStrength: number;
  /** Node-repulsion magnitude (charge strength = `-repelStrength`). */
  repelStrength: number;
  /** Preferred edge length (`forceLink().distance`). */
  linkDistance: number;
}

/** Cosmetic knobs. */
export interface DisplayConfig {
  /** Draw directional arrowheads on edges. */
  showArrows: boolean;
  /** Zoom level (globalScale) at/above which node labels render. 0 = always. */
  labelThreshold: number;
  /** Base node radius multiplier. */
  nodeSize: number;
  /** Base edge stroke width. */
  linkThickness: number;
}

export const DEFAULT_FORCE: ForceConfig = {
  centerStrength: 0.05,
  repelStrength: 80,
  linkDistance: 45,
};

export const DEFAULT_DISPLAY: DisplayConfig = {
  showArrows: false,
  labelThreshold: 1.4,
  nodeSize: 3,
  linkThickness: 1,
};

/** Local (ego) graph presets — tighter spread, always-on labels for a small
 *  panel beside the backlinks list. */
export const LOCAL_FORCE: ForceConfig = {
  centerStrength: 0.12,
  repelStrength: 55,
  linkDistance: 36,
};

export const LOCAL_DISPLAY: DisplayConfig = {
  showArrows: true,
  labelThreshold: 0,
  nodeSize: 3,
  linkThickness: 1,
};
