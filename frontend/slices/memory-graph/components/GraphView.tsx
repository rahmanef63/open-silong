"use client";

/** Global knowledge graph canvas wrapper. Feeds the (host or client) graph
 *  model into the force canvas, navigates on node click, and forwards the
 *  host's "add child page" action to the hover-"+" affordance. Chrome (header,
 *  title, chat input) lives in `GraphPage`.
 */

import { useMemo } from "react";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { cn } from "@/shared/lib/utils";
import type { Graph, GraphNode } from "@/shared/types/graph";
import { useGraphModel, filterGraph } from "../hooks/useGraphModel";
import { DEFAULT_DISPLAY, DEFAULT_FILTER, DEFAULT_FORCE } from "../lib/forceConfig";
import { MEM } from "../lib/memoryTheme";
import { GraphCanvas } from "./GraphCanvasLazy";

export interface GraphViewProps {
  /** Host-supplied model (the server `getGlobalGraph` query). Omitted → the
   *  client model built from the pages store (portable/offline fallback). */
  model?: Graph;
  /** Host-supplied "create a child page under this node" action (hover "+"). */
  onAddChild?: (node: GraphNode) => void;
  className?: string;
}

export function GraphView({ model, onAddChild, className }: GraphViewProps) {
  const clientModel = useGraphModel();
  const source = model ?? clientModel;
  const navigate = useNavigate();

  const graph = useMemo(() => filterGraph(source, DEFAULT_FILTER), [source]);

  const handleClick = (node: GraphNode) => {
    if (node.kind === "page") navigate(ROUTES.page(node.id));
  };

  if (graph.nodes.length === 0) {
    return (
      <div
        className={cn("flex h-full w-full items-center justify-center p-8 text-center text-sm", className)}
        style={{ color: MEM.muted }}
      >
        No memories yet — add one below to grow your graph.
      </div>
    );
  }

  return (
    <GraphCanvas
      graph={graph}
      force={DEFAULT_FORCE}
      display={DEFAULT_DISPLAY}
      onNodeClick={handleClick}
      onAddChild={onAddChild}
      className={cn("relative h-full w-full", className)}
    />
  );
}
