"use client";

/** Global graph wrapper. Renders the host-supplied model, navigates on node
 *  click, forwards "add child page" to the hover "+".
 */

import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { cn } from "@/shared/lib/utils";
import type { Graph, GraphNode } from "@/shared/types/graph";
import { MemoryGraphView } from "./MemoryGraphView";

const EMPTY: Graph = { nodes: [], edges: [] };

export interface GraphViewProps {
  /** Host-supplied model (the server `getGlobalGraph` query). Empty while loading. */
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
    <MemoryGraphView graph={graph} onNodeClick={handleClick} onAddChild={onAddChild} className={className} />
  );
}
