"use client";

/** Full-page global graph view — the `/dashboard/graph` route body. Owns the
 *  filter/force/display config state and wires it to both the live `GraphView`
 *  canvas and the `GraphControls` sheet. Fills the dashboard content area
 *  (flex child of DashboardShell's `min-h-0` column).
 */

import { useState } from "react";
import { Network } from "lucide-react";
import type { Graph } from "@/shared/types/graph";
import { GraphView } from "../components/GraphView";
import { GraphControls } from "../components/GraphControls";
import {
  DEFAULT_DISPLAY,
  DEFAULT_FILTER,
  DEFAULT_FORCE,
  type DisplayConfig,
  type FilterConfig,
  type ForceConfig,
} from "../lib/forceConfig";

export interface GraphPageProps {
  /** Host-supplied graph model threaded into `GraphView`. Omitted → client
   *  fallback (portable slice). */
  model?: Graph;
}

export function GraphPage({ model }: GraphPageProps = {}) {
  const [filter, setFilter] = useState<FilterConfig>(DEFAULT_FILTER);
  const [force, setForce] = useState<ForceConfig>(DEFAULT_FORCE);
  const [display, setDisplay] = useState<DisplayConfig>(DEFAULT_DISPLAY);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Network className="size-4" />
          Graph
        </div>
        <GraphControls
          filter={filter}
          onFilterChange={setFilter}
          force={force}
          onForceChange={setForce}
          display={display}
          onDisplayChange={setDisplay}
        />
      </div>
      <div className="relative min-h-0 flex-1">
        <GraphView model={model} filter={filter} force={force} display={display} className="absolute inset-0" />
      </div>
    </div>
  );
}
