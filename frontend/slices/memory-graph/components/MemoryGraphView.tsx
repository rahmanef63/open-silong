"use client";

/** DOM + SVG knowledge graph — a purpose-built renderer (replaces the canvas
 *  lib so page ICONS render natively and colours stay theme-token dynamic).
 *
 *  Structure mirrors the reference "Memory" graph: a glowing CORE orb, rounded
 *  icon-CHIP hubs (the core's neighbours, showing each page's emoji icon), and
 *  faded PILL leaves. SVG lines are the connectors (highlighted on hover).
 *  Pan (drag background) · zoom (wheel) · drag nodes · hover a node for a "+"
 *  that adds a child page, with a dashed preview edge.
 *
 *  Positions are held in a ref and applied imperatively (CSS vars + SVG attrs)
 *  so pan/zoom/drag never re-render the whole node list. Colours come from the
 *  app theme tokens (color-mix for alpha), so it follows light/dark + presets.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Graph, GraphNode } from "@/shared/types/graph";

type Pos = { x: number; y: number };
type Role = "core" | "hub" | "leaf" | "ghost" | "tag";

const CX = 800;
const CY = 500;
const R_HUB = 210;
const R_LEAF = 155;

function analyze(graph: Graph) {
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
  let core: GraphNode | null = null;
  for (const n of graph.nodes) {
    if (n.kind !== "page") continue;
    if (!core || n.degree > core.degree) core = n;
  }
  const coreId = core?.id ?? null;
  const hubIds = coreId ? (adj.get(coreId) ?? new Set<string>()) : new Set<string>();
  const roleOf = (n: GraphNode): Role => {
    if (n.kind === "ghost") return "ghost";
    if (n.kind === "tag") return "tag";
    if (n.id === coreId) return "core";
    if (hubIds.has(n.id)) return "hub";
    return "leaf";
  };
  return { adj, coreId, hubIds, roleOf };
}

/** Deterministic radial layout: core centre → hubs on a ring → each hub's
 *  neighbours fanned outward → unattached nodes on an outer ring. */
function layout(graph: Graph, a: ReturnType<typeof analyze>): Map<string, Pos> {
  const pos = new Map<string, Pos>();
  if (a.coreId) pos.set(a.coreId, { x: CX, y: CY });

  const hubs = graph.nodes.filter((n) => a.roleOf(n) === "hub");
  hubs.forEach((h, i) => {
    const ang = (i / Math.max(1, hubs.length)) * Math.PI * 2 - Math.PI / 2;
    pos.set(h.id, { x: CX + Math.cos(ang) * R_HUB, y: CY + Math.sin(ang) * R_HUB });
  });

  const hubSet = new Set(hubs.map((h) => h.id));
  const byHub = new Map<string, GraphNode[]>();
  const orphans: GraphNode[] = [];
  for (const n of graph.nodes) {
    const r = a.roleOf(n);
    if (r === "core" || r === "hub") continue;
    let hub: string | null = null;
    for (const nb of a.adj.get(n.id) ?? []) {
      if (hubSet.has(nb)) {
        hub = nb;
        break;
      }
    }
    if (hub) (byHub.get(hub) ?? byHub.set(hub, []).get(hub)!).push(n);
    else orphans.push(n);
  }

  for (const [hubId, kids] of byHub) {
    const hp = pos.get(hubId)!;
    const out = Math.atan2(hp.y - CY, hp.x - CX);
    kids.forEach((k, i) => {
      const ang = out + (i - (kids.length - 1) / 2) * 0.5;
      const dist = R_LEAF + (i % 2) * 26;
      pos.set(k.id, { x: hp.x + Math.cos(ang) * dist, y: hp.y + Math.sin(ang) * dist });
    });
  }
  orphans.forEach((n, i) => {
    const ang = (i / Math.max(1, orphans.length)) * Math.PI * 2;
    const d = R_HUB + R_LEAF + 130;
    pos.set(n.id, { x: CX + Math.cos(ang) * d, y: CY + Math.sin(ang) * d });
  });
  return pos;
}

export interface MemoryGraphViewProps {
  graph: Graph;
  onNodeClick?: (node: GraphNode) => void;
  onAddChild?: (node: GraphNode) => void;
  className?: string;
}

export function MemoryGraphView({ graph, onNodeClick, onAddChild, className }: MemoryGraphViewProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const edgesRef = useRef<SVGSVGElement | null>(null);
  const addRef = useRef<HTMLButtonElement | null>(null);

  const meta = useMemo(() => analyze(graph), [graph]);
  const posRef = useRef<Map<string, Pos>>(new Map());
  const view = useRef({ x: 0, y: 0, scale: 0.85 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodeById = useCallback((id: string) => graph.nodes.find((n) => n.id === id) ?? null, [graph]);

  // (Re)compute positions whenever the graph changes.
  useMemo(() => {
    posRef.current = layout(graph, meta);
  }, [graph, meta]);

  const applyView = useCallback(() => {
    const w = worldRef.current;
    if (w) w.style.transform = `translate(${view.current.x}px, ${view.current.y}px) scale(${view.current.scale})`;
  }, []);

  /** Slot just outside a node where its "+" (and preview edge) sits. */
  const addSlot = useCallback(
    (id: string): Pos | null => {
      const p = posRef.current.get(id);
      if (!p) return null;
      const out = Math.atan2(p.y - CY, p.x - CX) || -Math.PI / 3;
      return { x: p.x + Math.cos(out) * 62, y: p.y + Math.sin(out) * 62 };
    },
    [],
  );

  const redrawEdges = useCallback(() => {
    const svg = edgesRef.current;
    if (!svg) return;
    const hov = hoverRef.current;
    const hset = new Set<string>();
    if (hov) {
      hset.add(hov);
      for (const nb of meta.adj.get(hov) ?? []) hset.add(nb);
    }
    let html = "";
    for (const e of graph.edges) {
      const a = posRef.current.get(e.source);
      const b = posRef.current.get(e.target);
      if (!a || !b) continue;
      const hot = hov && hset.has(e.source) && hset.has(e.target);
      html += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="${hot ? "mg-edge-hot" : "mg-edge"}"/>`;
    }
    // Dashed preview from the hovered node to its "+" slot.
    if (hov) {
      const p = posRef.current.get(hov);
      const slot = addSlot(hov);
      const node = nodeById(hov);
      if (p && slot && node && node.kind === "page") {
        html += `<line x1="${p.x}" y1="${p.y}" x2="${slot.x}" y2="${slot.y}" class="mg-edge-temp"/>`;
      }
    }
    svg.innerHTML = html;
  }, [graph, meta, addSlot, nodeById]);

  const applyNodePos = useCallback((id: string) => {
    const p = posRef.current.get(id);
    const el = worldRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
    if (p && el) {
      el.style.setProperty("--x", `${p.x}px`);
      el.style.setProperty("--y", `${p.y}px`);
    }
  }, []);

  const applyAll = useCallback(() => {
    for (const id of posRef.current.keys()) applyNodePos(id);
    redrawEdges();
  }, [applyNodePos, redrawEdges]);

  const positionAdd = useCallback(() => {
    const btn = addRef.current;
    const hov = hoverRef.current;
    if (!btn) return;
    const slot = hov ? addSlot(hov) : null;
    const node = hov ? nodeById(hov) : null;
    if (slot && node && node.kind === "page" && onAddChild) {
      btn.style.setProperty("--x", `${slot.x}px`);
      btn.style.setProperty("--y", `${slot.y}px`);
      btn.classList.add("mg-add-visible");
    } else {
      btn.classList.remove("mg-add-visible");
    }
  }, [addSlot, nodeById, onAddChild]);

  useLayoutEffect(() => {
    applyView();
    applyAll();
    // Center the graph in the viewport on first layout / graph change.
    const stage = stageRef.current;
    if (stage) {
      const r = stage.getBoundingClientRect();
      view.current.x = r.width / 2 - CX * view.current.scale;
      view.current.y = r.height / 2 - CY * view.current.scale;
      applyView();
    }
  }, [graph, applyView, applyAll]);

  // ── pan / zoom ─────────────────────────────────────────────
  const dragRef = useRef<{ mode: "pan" | "node" | null; id?: string; sx: number; sy: number; ox: number; oy: number }>({
    mode: null,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
  });

  const onStagePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const nodeEl = target.closest<HTMLElement>("[data-id]");
    if (nodeEl) {
      const id = nodeEl.dataset.id!;
      const node = nodeById(id);
      if (node && node.kind !== "page") {
        // ghost/tag: not draggable, click only handled below
      }
      const p = posRef.current.get(id);
      if (p) {
        dragRef.current = { mode: "node", id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
    }
    dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, ox: view.current.x, oy: view.current.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onStagePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d.mode === "pan") {
      view.current.x = d.ox + (e.clientX - d.sx);
      view.current.y = d.oy + (e.clientY - d.sy);
      applyView();
    } else if (d.mode === "node" && d.id) {
      const s = view.current.scale;
      posRef.current.set(d.id, { x: d.ox + (e.clientX - d.sx) / s, y: d.oy + (e.clientY - d.sy) / s });
      applyNodePos(d.id);
      redrawEdges();
      positionAdd();
    }
  };

  const onStagePointerUp = () => {
    dragRef.current.mode = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const wx = (px - view.current.x) / view.current.scale;
    const wy = (py - view.current.y) / view.current.scale;
    const next = Math.min(1.6, Math.max(0.35, view.current.scale * (1 - e.deltaY * 0.001)));
    view.current.scale = next;
    view.current.x = px - wx * next;
    view.current.y = py - wy * next;
    applyView();
  };

  // ── hover "+" ──────────────────────────────────────────────
  const clearHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };
  const enterNode = (id: string) => {
    clearHide();
    hoverRef.current = id;
    setHoverId(id);
    positionAdd();
    redrawEdges();
  };
  const leaveNode = () => {
    clearHide();
    hideTimer.current = setTimeout(() => {
      hoverRef.current = null;
      setHoverId(null);
      positionAdd();
      redrawEdges();
    }, 160);
  };

  useEffect(() => {
    positionAdd();
  }, [hoverId, positionAdd]);

  return (
    <div
      ref={stageRef}
      className={cn("relative h-full w-full touch-none overflow-hidden", className)}
      style={{ cursor: "grab" }}
      onPointerDown={onStagePointerDown}
      onPointerMove={onStagePointerMove}
      onPointerUp={onStagePointerUp}
      onWheel={onWheel}
    >
      <style>{MG_CSS}</style>
      <div ref={worldRef} className="mg-world absolute left-0 top-0" style={{ width: 1600, height: 1000 }}>
        <svg ref={edgesRef} className="mg-edges absolute inset-0 overflow-visible" viewBox="0 0 1600 1000" aria-hidden />
        {graph.nodes.map((n) => {
          const role = meta.roleOf(n);
          const cls = `mg-node mg-${role}${hoverId === n.id ? " mg-hover" : ""}`;
          const label = n.title || "Untitled";
          const handlers = {
            onPointerEnter: () => enterNode(n.id),
            onPointerLeave: leaveNode,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              if (dragRef.current.mode === null) onNodeClick?.(n);
            },
          };
          if (role === "core")
            return <button key={n.id} data-id={n.id} type="button" className={cls} aria-label={label} {...handlers} />;
          if (role === "hub")
            return (
              <button key={n.id} data-id={n.id} type="button" className={cls} aria-label={label} {...handlers}>
                <span className="mg-icon">{n.icon || label.slice(0, 1).toUpperCase() || "•"}</span>
              </button>
            );
          if (role === "tag")
            return (
              <button key={n.id} data-id={n.id} type="button" className={cls} title={label} {...handlers}>
                #{label.replace(/^tag:/, "")}
              </button>
            );
          return (
            <button key={n.id} data-id={n.id} type="button" className={cls} title={label} {...handlers}>
              {n.icon ? <span className="mg-icon-sm">{n.icon}</span> : null}
              {label}
            </button>
          );
        })}
        <button
          ref={addRef}
          type="button"
          className="mg-add"
          aria-label="Add child page"
          onPointerEnter={clearHide}
          onPointerLeave={leaveNode}
          onClick={(e) => {
            e.stopPropagation();
            const node = hoverRef.current ? nodeById(hoverRef.current) : null;
            if (node && onAddChild) onAddChild(node);
          }}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* Scoped styles. Positions via --x/--y (set imperatively). All colours are
 * theme tokens (color-mix for alpha) so light/dark + presets flow through. */
const MG_CSS = `
.mg-world{transform-origin:0 0;will-change:transform}
.mg-edges line{vector-effect:non-scaling-stroke}
.mg-edge{stroke:var(--border);stroke-width:1.2}
.mg-edge-hot{stroke:color-mix(in srgb, var(--primary) 80%, transparent);stroke-width:1.6}
.mg-edge-temp{stroke:color-mix(in srgb, var(--primary) 55%, transparent);stroke-width:1.6;stroke-dasharray:4 5}
.mg-node{position:absolute;left:var(--x,0);top:var(--y,0);transform:translate(-50%,-50%);border:0;background:transparent;padding:0;cursor:pointer;user-select:none;touch-action:none}
.mg-core{width:56px;height:56px;border-radius:999px;
  background:radial-gradient(circle at 50% 50%, color-mix(in srgb,var(--primary) 92%, white) 0 22%, color-mix(in srgb,var(--primary) 70%, transparent) 40%, color-mix(in srgb,var(--primary) 22%, transparent) 68%, transparent 100%);
  box-shadow:0 0 26px color-mix(in srgb,var(--primary) 30%, transparent), 0 12px 40px rgba(0,0,0,.25);cursor:grab}
.mg-hub{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;
  background:color-mix(in srgb,var(--card) 90%, transparent);border:1px solid var(--border);color:var(--foreground);
  box-shadow:0 8px 22px rgba(0,0,0,.16);cursor:grab;transition:transform .15s ease,border-color .15s ease}
.mg-hub:hover,.mg-hub.mg-hover{transform:translate(-50%,-50%) scale(1.08);border-color:color-mix(in srgb,var(--primary) 45%, var(--border))}
.mg-icon{font-size:16px;line-height:1}
.mg-icon-sm{font-size:11px;margin-right:2px}
.mg-leaf,.mg-tag{min-width:64px;height:24px;padding:0 12px;display:flex;align-items:center;gap:4px;border-radius:999px;white-space:nowrap;
  font-size:11px;font-weight:600;letter-spacing:-.01em;
  color:var(--muted-foreground);background:color-mix(in srgb,var(--muted) 55%, transparent);border:1px solid transparent;
  opacity:.72;transition:opacity .15s ease,transform .15s ease,color .15s ease,background .15s ease,border-color .15s ease}
.mg-leaf:hover,.mg-leaf.mg-hover,.mg-tag:hover,.mg-tag.mg-hover{opacity:1;color:var(--foreground);transform:translate(-50%,-50%) scale(1.05);
  background:color-mix(in srgb,var(--card) 90%, transparent);border-color:color-mix(in srgb,var(--primary) 30%, var(--border))}
.mg-tag{color:var(--primary);background:color-mix(in srgb,var(--primary) 12%, transparent)}
.mg-ghost{border-style:dashed;border-color:var(--muted-foreground);opacity:.5}
.mg-add{position:absolute;left:var(--x,0);top:var(--y,0);transform:translate(-50%,-50%) scale(.9);width:30px;height:30px;border-radius:999px;
  display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--primary) 40%, var(--border));
  background:color-mix(in srgb,var(--background) 70%, var(--primary) 12%);color:var(--foreground);
  box-shadow:0 10px 26px rgba(0,0,0,.3);cursor:pointer;opacity:0;pointer-events:none;transition:opacity .14s ease,transform .14s ease;z-index:8}
.mg-add.mg-add-visible{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}
.mg-add:hover{transform:translate(-50%,-50%) scale(1.1)}
`;
