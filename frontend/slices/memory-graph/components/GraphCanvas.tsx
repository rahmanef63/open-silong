"use client";

/** The force-directed canvas — the only place `react-force-graph-2d` is
 *  imported (loaded via `GraphCanvasLazy` = next/dynamic ssr:false).
 *
 *  Colours are THEME-DYNAMIC: every fill/stroke derives from the app's CSS
 *  theme tokens via `useGraphTheme()` + `withAlpha`, so the graph follows
 *  light/dark + tweakcn presets like the rest of the app. Node roles: a glowing
 *  HUB orb (highest-degree node), icon CHIPS for its neighbours, PILLS with a
 *  title for leaves. Hovering a page node reveals a "+" to add a child page.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { Plus } from "lucide-react";
import ForceGraph2D from "react-force-graph-2d";
import { Button } from "@/shared/ui/button";
import type { Graph, GraphEdge, GraphNode } from "@/shared/types/graph";
import { useGraphTheme, withAlpha } from "../lib/themeBridge";
import type { DisplayConfig, ForceConfig } from "../lib/forceConfig";

type FGNode = GraphNode & { x?: number; y?: number };
type FGLink = { source: string | FGNode; target: string | FGNode } & Partial<GraphEdge>;

interface ForceGraph2DProps {
  graphData: { nodes: FGNode[]; links: FGLink[] };
  width?: number;
  height?: number;
  backgroundColor?: string;
  nodeRelSize?: number;
  cooldownTicks?: number;
  d3VelocityDecay?: number;
  linkColor?: (link: FGLink) => string;
  linkWidth?: (link: FGLink) => number;
  linkDirectionalArrowLength?: number;
  nodeCanvasObjectMode?: () => "replace" | "before" | "after";
  nodeCanvasObject?: (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodePointerAreaPaint?: (node: FGNode, color: string, ctx: CanvasRenderingContext2D) => void;
  onNodeClick?: (node: FGNode) => void;
  onNodeHover?: (node: FGNode | null) => void;
  onEngineStop?: () => void;
  nodeLabel?: (node: FGNode) => string;
}

interface FGHandle {
  d3Force: (name: string) => { strength?: (v: number) => void; distance?: (v: number) => void } | undefined;
  d3ReheatSimulation: () => void;
  zoomToFit: (ms?: number, padding?: number) => void;
  graph2ScreenCoords: (x: number, y: number) => { x: number; y: number };
}

const FG = ForceGraph2D as unknown as ForwardRefExoticComponent<
  ForceGraph2DProps & RefAttributes<FGHandle | null>
>;

export interface GraphCanvasProps {
  graph: Graph;
  force: ForceConfig;
  display: DisplayConfig;
  onNodeClick?: (node: GraphNode) => void;
  onAddChild?: (node: GraphNode) => void;
  className?: string;
}

type Role = "hub" | "category" | "leaf" | "ghost" | "tag";

const linkEndId = (end: string | FGNode): string => (typeof end === "string" ? end : end.id);
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function GraphCanvas({
  graph,
  force,
  display,
  onNodeClick,
  onAddChild,
  className,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<FGHandle | null>(null);
  const plusRef = useRef<HTMLButtonElement | null>(null);
  const hoverNodeRef = useRef<FGNode | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const didFit = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const scheduleHide = () => {
    clearHide();
    hideTimer.current = setTimeout(() => setHoverId(null), 150);
  };

  const theme = useGraphTheme();
  const ns = display.nodeSize / 3; // config-driven size scale (default 1)

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const { hubId, categoryIds } = useMemo(() => {
    let best: GraphNode | null = null;
    for (const n of graph.nodes) {
      if (n.kind !== "page") continue;
      if (!best || n.degree > best.degree) best = n;
    }
    return {
      hubId: best?.id ?? null,
      categoryIds: best ? (adjacency.get(best.id) ?? new Set<string>()) : new Set<string>(),
    };
  }, [graph, adjacency]);

  const roleOf = useCallback(
    (node: GraphNode): Role => {
      if (node.kind === "ghost") return "ghost";
      if (node.kind === "tag") return "tag";
      if (node.id === hubId) return "hub";
      if (categoryIds.has(node.id)) return "category";
      return "leaf";
    },
    [hubId, categoryIds],
  );

  const highlighted = useMemo(() => {
    if (!hoverId) return null;
    const set = new Set<string>([hoverId]);
    for (const nb of adjacency.get(hoverId) ?? []) set.add(nb);
    return set;
  }, [hoverId, adjacency]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength?.(-force.repelStrength);
    fg.d3Force("link")?.distance?.(force.linkDistance);
    fg.d3Force("center")?.strength?.(force.centerStrength);
    fg.d3ReheatSimulation();
  }, [force, graphData]);

  const paintNode = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const role = roleOf(node);
      const dim = highlighted != null && !highlighted.has(node.id);
      ctx.save();
      ctx.globalAlpha = dim ? 0.14 : 1;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (role === "hub") {
        const core = (8 + Math.min(6, Math.sqrt(node.degree) * 1.2)) * ns;
        const halo = core * 2.6;
        const g = ctx.createRadialGradient(x, y, 0, x, y, halo);
        g.addColorStop(0, theme.node);
        g.addColorStop(0.45, withAlpha(theme.node, 0.45));
        g.addColorStop(1, withAlpha(theme.node, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, halo, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = theme.node;
        ctx.beginPath();
        ctx.arc(x, y, core * 0.6, 0, 2 * Math.PI);
        ctx.fill();
      } else if (role === "category") {
        const s = 9 * ns;
        roundRect(ctx, x - s, y - s, s * 2, s * 2, 4 * ns);
        ctx.fillStyle = withAlpha(theme.text, 0.06);
        ctx.fill();
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = theme.border;
        ctx.stroke();
        const glyph = node.icon || node.title.slice(0, 1).toUpperCase() || "•";
        ctx.font = `${s * 1.05}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = theme.text;
        ctx.fillText(glyph, x, y + 0.5);
        if (highlighted?.has(node.id)) {
          ctx.font = `${4 * ns}px ui-sans-serif, system-ui, sans-serif`;
          ctx.fillStyle = theme.muted;
          ctx.fillText(trunc(node.title, 24), x, y + s + 5);
        }
      } else if (role === "ghost") {
        const r = 5 * ns;
        ctx.setLineDash([2.2, 1.8]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = theme.muted;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (role === "tag") {
        const s = 6 * ns;
        roundRect(ctx, x - s, y - s, s * 2, s * 2, 3 * ns);
        ctx.fillStyle = withAlpha(theme.tag, 0.15);
        ctx.fill();
        ctx.font = `${s * 1.1}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = theme.tag;
        ctx.fillText("#", x, y + 0.5);
      } else {
        const label = trunc(node.title || "Untitled", 22);
        const fs = 4 * ns;
        ctx.font = `${fs}px ui-sans-serif, system-ui, sans-serif`;
        const tw = ctx.measureText(label).width;
        const padX = 4 * ns;
        const h = fs + 5 * ns;
        const w = tw + padX * 2;
        roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
        ctx.fillStyle = withAlpha(theme.text, 0.05);
        ctx.fill();
        ctx.fillStyle = theme.muted;
        ctx.fillText(label, x, y + 0.3);
      }
      ctx.restore();
    },
    [roleOf, highlighted, theme, ns],
  );

  const paintPointerArea = useCallback(
    (node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const role = roleOf(node);
      ctx.fillStyle = color;
      if (role === "leaf") {
        const label = trunc(node.title || "Untitled", 22);
        ctx.font = `${4 * ns}px ui-sans-serif, system-ui, sans-serif`;
        const w = ctx.measureText(label).width + 8 * ns;
        const h = 9 * ns;
        roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
        ctx.fill();
      } else {
        const r = (role === "hub" ? 12 : role === "category" ? 11 : 7) * ns;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
      }
    },
    [roleOf, ns],
  );

  const linkColor = useCallback(
    (link: FGLink): string => {
      if (!highlighted) return theme.link;
      const incident =
        highlighted.has(linkEndId(link.source)) && highlighted.has(linkEndId(link.target));
      return incident ? withAlpha(theme.node, 0.85) : withAlpha(theme.link, 0.3);
    },
    [highlighted, theme],
  );

  const linkWidth = useCallback(
    (link: FGLink): number => {
      const base = display.linkThickness * 0.6;
      if (!highlighted) return base;
      const incident =
        highlighted.has(linkEndId(link.source)) && highlighted.has(linkEndId(link.target));
      return incident ? base * 2.2 : base;
    },
    [highlighted, display.linkThickness],
  );

  useEffect(() => {
    if (!hoverId || !onAddChild) {
      hoverNodeRef.current = null;
      if (plusRef.current) plusRef.current.style.display = "none";
      return;
    }
    const node = graphData.nodes.find((n) => n.id === hoverId) ?? null;
    hoverNodeRef.current = node;
    const role = node ? roleOf(node) : "leaf";
    if (!node || role === "ghost" || role === "tag") {
      if (plusRef.current) plusRef.current.style.display = "none";
      return;
    }
    let raf = 0;
    const tick = () => {
      const fg = fgRef.current;
      const btn = plusRef.current;
      const n = hoverNodeRef.current;
      if (fg && btn && n && n.x != null && n.y != null) {
        const p = fg.graph2ScreenCoords(n.x, n.y);
        btn.style.display = "flex";
        btn.style.left = `${p.x}px`;
        btn.style.top = `${p.y}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hoverId, graphData, roleOf, onAddChild]);

  return (
    <div ref={containerRef} className={className ?? "relative h-full w-full"}>
      {size.w > 0 && size.h > 0 ? (
        <>
          <FG
            ref={fgRef}
            graphData={graphData}
            width={size.w}
            height={size.h}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={4 * ns}
            cooldownTicks={140}
            d3VelocityDecay={0.32}
            nodeLabel={(n) => n.title}
            nodeCanvasObjectMode={() => "replace"}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={paintPointerArea}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkDirectionalArrowLength={display.showArrows ? 3 : 0}
            onNodeHover={(n) => {
              if (n) {
                clearHide();
                setHoverId(n.id);
              } else {
                scheduleHide();
              }
            }}
            onNodeClick={(n) => onNodeClick?.(n)}
            onEngineStop={() => {
              if (didFit.current) return;
              didFit.current = true;
              fgRef.current?.zoomToFit(500, 60);
            }}
          />
          <Button
            ref={plusRef}
            type="button"
            size="icon"
            variant="outline"
            aria-label="Add child page"
            style={{
              display: "none",
              position: "absolute",
              left: 0,
              top: 0,
              transform: "translate(14px, -14px)",
            }}
            className="z-10 size-6 rounded-full"
            onMouseEnter={() => {
              clearHide();
              if (plusRef.current) plusRef.current.style.display = "flex";
            }}
            onMouseLeave={scheduleHide}
            onClick={() => {
              const n = hoverNodeRef.current;
              if (n && onAddChild) onAddChild(n);
            }}
          >
            <Plus className="size-3.5" />
          </Button>
        </>
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
