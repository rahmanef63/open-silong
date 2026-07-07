"use client";

/** Global graph canvas wrapper. Renders the host-supplied model, navigates on
 *  node click, forwards the host's "add child page" action to the hover "+".
 */

import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { cn } from "@/shared/lib/utils";
import type { Graph, GraphNode } from "@/shared/types/graph";
import { DEFAULT_DISPLAY, DEFAULT_FORCE } from "../lib/forceConfig";
import { GraphCanvas } from "./GraphCanvasLazy";

const EMPTY: Graph = { nodes: [], edges: [] };

export interface GraphViewProps {
  /** Host-supplied model (the server `getGlobalGraph` query). Falls back to an
   *  empty graph while the query loads. */
  model?: Graph;
  onAddChild?: (node: GraphNode) => void;
  emptyLabel?: string;
  className?: string;
}

export function GraphView({
  model,
  onAddChild,
  emptyLabel = "Nothing to graph yet.",
  className,
}: GraphViewProps) {
  const navigate = useNavigate();
  const graph = model ?? EMPTY;

  const handleClick = (node: GraphNode) => {
    if (node.kind === "page") navigate(ROUTES.page(node.id));
  };

  if (graph.nodes.length === 0) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center p-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyLabel}
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
