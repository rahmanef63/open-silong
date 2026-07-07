"use client";

/** The force-directed canvas — the only place `react-force-graph-2d` is
 *  imported. This module is loaded exclusively through `next/dynamic({ ssr:
 *  false })` (see `GraphCanvasLazy`) because the library touches `window` /
 *  `canvas` at module load and SSR-crashes Next 16 otherwise. Keeping the ref
 *  *inside* this component (not threaded through `dynamic`) is deliberate:
 *  `next/dynamic` does not forward refs, and we need one to drive `d3Force`.
 *
 *  Node paint: radius ∝ degree, hubs bigger + brand-coloured, ghosts dim +
 *  dashed, tags a distinct hue + rounded-square. Hover highlights the 1-hop
 *  neighbourhood and fades the rest. Colours come from the theme bridge so the
 *  canvas tracks light/dark + tweakcn presets.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { Graph, GraphEdge, GraphNode } from "@/shared/types/graph";
import { withAlpha, type GraphTheme } from "../lib/themeBridge";
import type { DisplayConfig, ForceConfig } from "../lib/forceConfig";

type FGNode = GraphNode & { x?: number; y?: number };
type FGLink = { source: string | FGNode; target: string | FGNode } & Partial<GraphEdge>;

/** Minimal shape of the props we pass — avoids coupling to the library's own
 *  (loosely-typed) prop exports. */
interface ForceGraph2DProps {
  graphData: { nodes: FGNode[]; links: FGLink[] };
  width?: number;
  height?: number;
  backgroundColor?: string;
  nodeId?: string;
  nodeRelSize?: number;
  cooldownTicks?: number;
  d3VelocityDecay?: number;
  linkColor?: (link: FGLink) => string;
  linkWidth?: (link: FGLink) => number;
  linkDirectionalArrowLength?: number;
  linkDirectionalArrowRelPos?: number;
  linkDirectionalArrowColor?: (link: FGLink) => string;
  nodeCanvasObjectMode?: () => "replace" | "before" | "after";
  nodeCanvasObject?: (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodePointerAreaPaint?: (node: FGNode, color: string, ctx: CanvasRenderingContext2D) => void;
  onNodeClick?: (node: FGNode) => void;
  onNodeHover?: (node: FGNode | null) => void;
  onEngineStop?: () => void;
  nodeLabel?: (node: FGNode) => string;
  enableNodeDrag?: boolean;
}

/** Imperative handle we drive after mount. */
interface FGHandle {
  d3Force: (name: string) => { strength?: (v: number) => void; distance?: (v: number) => void } | undefined;
  d3ReheatSimulation: () => void;
  zoomToFit: (ms?: number, padding?: number) => void;
}

const FG = ForceGraph2D as unknown as ForwardRefExoticComponent<
  ForceGraph2DProps & RefAttributes<FGHandle | null>
>;

export interface GraphCanvasProps {
  graph: Graph;
  theme: GraphTheme;
  force: ForceConfig;
  display: DisplayConfig;
  onNodeClick?: (node: GraphNode) => void;
  className?: string;
}

const linkEndId = (end: string | FGNode): string =>
  typeof end === "string" ? end : end.id;

export default function GraphCanvas({
  graph,
  theme,
  force,
  display,
  onNodeClick,
  className,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<FGHandle | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const didFit = useRef(false);

  // Measure the container so the canvas gets explicit pixel dimensions.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fresh graphData each time the model changes: react-force-graph mutates the
  // link source/target (id → node ref) + node x/y in place, so we hand it
  // copies and let hover/theme re-renders keep the same objects (positions
  // persist). Also resets the one-shot zoom-to-fit.
  const graphData = useMemo(() => {
    didFit.current = false;
    return {
      nodes: graph.nodes.map((n) => ({ ...n })),
      links: graph.edges.map((e) => ({ ...e })),
    };
  }, [graph]);

  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    const add = (a: string, b: string) => {
      let s = adj.get(a);
      if (!s) adj.set(a, (s = new Set()));
      s.add(b);
    };
    for (const e of graph.edges) {
      add(e.source, e.target);
      add(e.target, e.source);
    }
    return adj;
  }, [graph]);

  const highlighted = useMemo(() => {
    if (!hoverId) return null;
    const set = new Set<string>([hoverId]);
    for (const nb of adjacency.get(hoverId) ?? []) set.add(nb);
    return set;
  }, [hoverId, adjacency]);

  // Apply the physics config to the built-in forces, then reheat.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength?.(-force.repelStrength);
    fg.d3Force("link")?.distance?.(force.linkDistance);
    fg.d3Force("center")?.strength?.(force.centerStrength);
    fg.d3ReheatSimulation();
  }, [force, graphData]);

  const radiusFor = useCallback(
    (node: GraphNode): number => {
      const base = display.nodeSize;
      const grow = Math.sqrt(node.degree || 0) * (display.nodeSize * 0.5);
      const r = base + grow;
      return node.hub ? r * 1.6 : r;
    },
    [display.nodeSize],
  );

  const colorFor = useCallback(
    (node: GraphNode): string => {
      if (node.kind === "ghost") return theme.ghost;
      if (node.kind === "tag") return theme.tag;
      if (node.hub) return theme.hub;
      return theme.node;
    },
    [theme],
  );

  const paintNode = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const r = radiusFor(node);
      const dim = highlighted != null && !highlighted.has(node.id);

      ctx.save();
      ctx.globalAlpha = dim ? 0.12 : node.kind === "ghost" ? 0.75 : 1;

      const fill = colorFor(node);
      if (node.kind === "ghost") {
        // Hollow dashed ring for unresolved links.
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.setLineDash([r * 0.6, r * 0.5]);
        ctx.lineWidth = Math.max(0.6, r * 0.28);
        ctx.strokeStyle = fill;
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (node.kind === "tag") {
        // Rounded square to read distinctly from page circles.
        const s = r * 1.7;
        const rad = r * 0.4;
        roundRect(ctx, x - s / 2, y - s / 2, s, s, rad);
        ctx.fillStyle = fill;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = fill;
        ctx.fill();
        if (node.hub) {
          ctx.lineWidth = Math.max(0.5, r * 0.18);
          ctx.strokeStyle = withAlpha(theme.bg, 0.9);
          ctx.stroke();
        }
      }

      // Labels: only past the fade threshold (or when this node is hovered).
      const showLabel =
        globalScale >= display.labelThreshold || (highlighted != null && highlighted.has(node.id));
      if (showLabel && !dim) {
        const fontSize = Math.max(2, 11 / globalScale);
        ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = node.kind === "ghost" ? theme.muted : theme.text;
        const label = node.title.length > 28 ? node.title.slice(0, 27) + "…" : node.title;
        ctx.fillText(label, x, y + r + 1.5);
      }

      ctx.restore();
    },
    [radiusFor, colorFor, highlighted, display.labelThreshold, theme],
  );

  const paintPointerArea = useCallback(
    (node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const r = radiusFor(node) + 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
    },
    [radiusFor],
  );

  const linkColor = useCallback(
    (link: FGLink): string => {
      if (!highlighted) return withAlpha(theme.link, 0.9);
      const incident = highlighted.has(linkEndId(link.source)) && highlighted.has(linkEndId(link.target));
      return incident ? withAlpha(theme.hub, 0.9) : withAlpha(theme.link, 0.15);
    },
    [highlighted, theme],
  );

  const linkWidth = useCallback(
    (link: FGLink): number => {
      const base = link.resolved === false ? display.linkThickness * 0.7 : display.linkThickness;
      if (!highlighted) return base;
      const incident = highlighted.has(linkEndId(link.source)) && highlighted.has(linkEndId(link.target));
      return incident ? base * 2 : base;
    },
    [highlighted, display.linkThickness],
  );

  const handleClick = useCallback(
    (node: FGNode) => {
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  return (
    <div ref={containerRef} className={className ?? "h-full w-full"}>
      {size.w > 0 && size.h > 0 ? (
        <FG
          ref={fgRef}
          graphData={graphData}
          width={size.w}
          height={size.h}
          backgroundColor={theme.bg}
          nodeRelSize={4}
          cooldownTicks={120}
          d3VelocityDecay={0.3}
          nodeLabel={(n) => n.title}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintPointerArea}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkDirectionalArrowLength={display.showArrows ? 3 : 0}
          linkDirectionalArrowRelPos={0.9}
          linkDirectionalArrowColor={linkColor}
          onNodeHover={(n) => setHoverId(n?.id ?? null)}
          onNodeClick={handleClick}
          onEngineStop={() => {
            if (didFit.current) return;
            didFit.current = true;
            fgRef.current?.zoomToFit(400, 48);
          }}
        />
      ) : null}
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
