"use client";

/** SSR-safe entry point for the force-graph canvas. `react-force-graph-2d`
 *  reads `window`/`canvas` at import, so the whole `GraphCanvas` module is
 *  code-split behind `next/dynamic({ ssr: false })` and only fetched in the
 *  browser. Every consumer imports the canvas from here — never `GraphCanvas`
 *  directly — so the raw library never lands in a server bundle.
 */

import dynamic from "next/dynamic";
import type { GraphCanvasProps } from "./GraphCanvas";

export const GraphCanvas = dynamic<GraphCanvasProps>(() => import("./GraphCanvas"), {
  ssr: false,
});
