"use client";

/** The force-directed canvas — the only place `react-force-graph-2d` is
 *  imported (loaded via `GraphCanvasLazy` = next/dynamic ssr:false, because the
 *  lib touches window/canvas at module load).
 *
 *  "Memory" look: a lime glowing HUB orb (highest-degree node), dark rounded
 *  ICON CHIPS for its direct neighbours (categories, showing the page emoji),
 *  and dark PILLS with a title for everything deeper (leaves). Background is
 *  transparent so the page's dotted grid shows through. Hovering a page node
 *  reveals a "+" affordance to add a child page.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { Plus } from "lucide-react";
import ForceGraph2D from "react-force-graph-2d";
import type { Graph, GraphEdge, GraphNode } from "@/shared/types/graph";
import { MEM } from "../lib/memoryTheme";
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

  // Hub = highest-degree page node; categories = its direct neighbours.
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
        const core = 8 + Math.min(6, Math.sqrt(node.degree) * 1.2);
        const halo = core * 2.6;
        const g = ctx.createRadialGradient(x, y, 0, x, y, halo);
        g.addColorStop(0, MEM.hubCore);
        g.addColorStop(0.4, MEM.accent);
        g.addColorStop(1, "rgba(212,248,74,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, halo, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = MEM.hubCore;
        ctx.beginPath();
        ctx.arc(x, y, core * 0.6, 0, 2 * Math.PI);
        ctx.fill();
      } else if (role === "category") {
        const s = 9;
        roundRect(ctx, x - s, y - s, s * 2, s * 2, 4);
        ctx.fillStyle = MEM.chip;
        ctx.fill();
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = MEM.chipBorder;
        ctx.stroke();
        const glyph = node.icon || node.title.slice(0, 1).toUpperCase() || "•";
        ctx.font = `${s * 1.05}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = MEM.text;
        ctx.fillText(glyph, x, y + 0.5);
        if (highlighted?.has(node.id)) {
          ctx.font = `4px ui-sans-serif, system-ui, sans-serif`;
          ctx.fillStyle = MEM.muted;
          ctx.fillText(trunc(node.title, 24), x, y + s + 5);
        }
      } else if (role === "ghost") {
        const r = 5;
        ctx.setLineDash([2.2, 1.8]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = MEM.muted;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (role === "tag") {
        const s = 6;
        roundRect(ctx, x - s, y - s, s * 2, s * 2, 3);
        ctx.fillStyle = "rgba(212,248,74,0.14)";
        ctx.fill();
        ctx.font = `${s * 1.1}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = MEM.accent;
        ctx.fillText("#", x, y + 0.5);
      } else {
        // leaf pill
        const label = trunc(node.title || "Untitled", 22);
        const fs = 4;
        ctx.font = `${fs}px ui-sans-serif, system-ui, sans-serif`;
        const tw = ctx.measureText(label).width;
        const padX = 4;
        const h = fs + 5;
        const w = tw + padX * 2;
        roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
        ctx.fillStyle = MEM.pill;
        ctx.fill();
        ctx.fillStyle = MEM.muted;
        ctx.fillText(label, x, y + 0.3);
      }
      ctx.restore();
    },
    [roleOf, highlighted],
  );

  const paintPointerArea = useCallback(
    (node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const role = roleOf(node);
      ctx.fillStyle = color;
      if (role === "leaf") {
        const label = trunc(node.title || "Untitled", 22);
        ctx.font = `4px ui-sans-serif, system-ui, sans-serif`;
        const w = ctx.measureText(label).width + 8;
        const h = 9;
        roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
        ctx.fill();
      } else {
        const r = role === "hub" ? 12 : role === "category" ? 11 : 7;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
      }
    },
    [roleOf],
  );

  const linkColor = useCallback(
    (link: FGLink): string => {
      if (!highlighted) return MEM.edge;
      const incident =
        highlighted.has(linkEndId(link.source)) && highlighted.has(linkEndId(link.target));
      return incident ? MEM.edgeHot : "rgba(255,255,255,0.04)";
    },
    [highlighted],
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

  // Glue the "+" overlay to the hovered page node every frame (follows the
  // simulation drift + zoom/pan). Imperative to avoid per-frame React renders.
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
            nodeRelSize={4}
            cooldownTicks={140}
            d3VelocityDecay={0.32}
            nodeLabel={(n) => n.title}
            nodeCanvasObjectMode={() => "replace"}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={paintPointerArea}
            linkColor={linkColor}
            linkWidth={linkWidth}
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
          {/* Hover "+" — add a child page. Positioned imperatively above. */}
          <button
            ref={plusRef}
            type="button"
            style={{
              display: "none",
              position: "absolute",
              left: 0,
              top: 0,
              transform: "translate(14px, -14px)",
            }}
            onMouseEnter={() => {
              clearHide();
              if (plusRef.current) plusRef.current.style.display = "flex";
            }}
            onMouseLeave={scheduleHide}
            onClick={() => {
              const n = hoverNodeRef.current;
              if (n && onAddChild) onAddChild(n);
            }}
            className="z-10 flex-col items-center gap-0.5"
            aria-label="Add memory"
          >
            <span
              className="flex size-6 items-center justify-center rounded-full border transition-transform hover:scale-110"
              style={{ borderColor: MEM.chipBorder, background: "rgba(255,255,255,0.08)", color: MEM.text }}
            >
              <Plus className="size-3.5" />
            </span>
            <span className="text-[9px]" style={{ color: MEM.muted }}>
              Add memory
            </span>
          </button>
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
