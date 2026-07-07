"use client";

/** Global knowledge graph. Builds the client model from the pages store,
 *  applies the filter switches, bridges theme colours onto the canvas, and
 *  navigates on node click (page → open; ghost/tag → no-op). A compact legend
 *  overlays the corner so the node encodings read at a glance.
 */

import { useMemo } from "react";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { cn } from "@/shared/lib/utils";
import type { Graph, GraphNode } from "@/shared/types/graph";
import { useGraphModel, filterGraph } from "../hooks/useGraphModel";
import { useGraphTheme } from "../lib/themeBridge";
import type { DisplayConfig, FilterConfig, ForceConfig } from "../lib/forceConfig";
import { GraphCanvas } from "./GraphCanvasLazy";

export interface GraphViewProps {
  filter: FilterConfig;
  force: ForceConfig;
  display: DisplayConfig;
  className?: string;
  /** Host-supplied graph model (e.g. the server `getGlobalGraph` query).
   *  Omitted → falls back to the client model built from the pages store,
   *  so the portable/offline slice still works. */
  model?: Graph;
}

export function GraphView({ filter, force, display, className, model }: GraphViewProps) {
  const clientModel = useGraphModel();
  const source = model ?? clientModel;
  const theme = useGraphTheme();
  const navigate = useNavigate();

  const graph = useMemo(() => filterGraph(source, filter), [source, filter]);

  const handleClick = (node: GraphNode) => {
    if (node.kind === "page") navigate(ROUTES.page(node.id));
    // ghost = unresolved link, tag = filter facet — no destination yet.
  };

  return (
    <div className={cn("relative h-full w-full", className)}>
      {graph.nodes.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Nothing to graph yet. Create pages and link them with{" "}
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">[[wikilinks]]</code>,
          mentions, or nesting.
        </div>
      ) : (
        <>
          <GraphCanvas
            graph={graph}
            theme={theme}
            force={force}
            display={display}
            onNodeClick={handleClick}
          />
          <GraphLegend />
        </>
      )}
    </div>
  );
}

function GraphLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1 rounded-md border border-border bg-card/80 px-2.5 py-2 text-[10px] text-muted-foreground backdrop-blur">
      <LegendRow className="bg-primary" label="Page" />
      <LegendRow className="bg-ring" label="Hub (wiki)" />
      <LegendRow className="bg-destructive" square label="Tag" />
      <LegendRow className="border border-dashed border-muted-foreground bg-transparent" label="Unresolved" />
    </div>
  );
}

function LegendRow({ className, label, square }: { className: string; label: string; square?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("inline-block size-2.5 shrink-0", square ? "rounded-[2px]" : "rounded-full", className)} />
      <span>{label}</span>
    </div>
  );
}
