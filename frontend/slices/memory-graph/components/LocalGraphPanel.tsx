"use client";

/** Per-note ego graph — a small force-graph of the current page's n-hop
 *  neighbourhood, meant to sit beside `BacklinksPanel` at the bottom of a
 *  page. Mirrors the backlinks section chrome (collapsible header + muted
 *  label). Renders nothing when the page has no connections.
 */

import { useState } from "react";
import { Network, ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { Button } from "@/shared/ui/button";
import { Slider } from "@/shared/ui/slider";
import type { GraphNode } from "@/shared/types/graph";
import { useLocalGraph } from "../hooks/useLocalGraph";
import { useGraphTheme } from "../lib/themeBridge";
import { LOCAL_DISPLAY, LOCAL_FORCE } from "../lib/forceConfig";
import { GraphCanvas } from "./GraphCanvasLazy";

interface Props {
  pageId: string;
}

export function LocalGraphPanel({ pageId }: Props) {
  const [open, setOpen] = useState(true);
  const [depth, setDepth] = useState(1);
  const graph = useLocalGraph(pageId, depth);
  const theme = useGraphTheme();
  const navigate = useNavigate();

  // Only the page itself, no neighbours → nothing worth drawing.
  if (graph.nodes.length <= 1) return null;

  const handleClick = (node: GraphNode) => {
    if (node.kind === "page") navigate(ROUTES.page(node.id));
  };

  return (
    <section className="mt-8 border-t border-border pt-6">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={() => setOpen((v) => !v)}
          className="h-auto gap-1.5 p-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:size-3"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Network className="h-3 w-3" />
          Graph
        </Button>
        {open && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Depth {depth}</span>
            <Slider
              min={1}
              max={3}
              step={1}
              value={[depth]}
              onValueChange={([v]) => setDepth(v)}
              className="w-20"
            />
          </div>
        )}
      </div>
      {open && (
        <div className="mt-3 h-64 overflow-hidden rounded-md border border-border bg-card">
          <GraphCanvas
            graph={graph}
            theme={theme}
            force={LOCAL_FORCE}
            display={LOCAL_DISPLAY}
            onNodeClick={handleClick}
          />
        </div>
      )}
    </section>
  );
}
