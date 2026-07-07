"use client";

/** DOM + SVG knowledge graph — purpose-built (no canvas lib) so page ICONS
 *  render natively and colours stay theme-token dynamic.
 *
 *  Glowing CORE orb · icon-CHIP hubs (emoji icon, lucide fallback) · faded PILL
 *  leaves · SVG connectors (highlight on hover). Pan (drag bg) · zoom (wheel) ·
 *  drag nodes · hover a node for a "+" that adds a child. A damped force sim
 *  (driven by the Forces sliders) settles the layout; "Animate" keeps it live.
 *  Filters/display/selection come from props (see lib/graphSettings).
 *
 *  Positions live in a ref and are applied imperatively (CSS vars + SVG attrs)
 *  so pan/zoom/drag/sim never re-render the node list.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Plus, Folder } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Graph, GraphNode } from "@/shared/types/graph";
import {
  DEFAULT_DISPLAY,
  DEFAULT_FILTERS,
  DEFAULT_FORCES,
  type GraphDisplay,
  type GraphFilters,
  type GraphForces,
} from "../lib/graphSettings";

type Role = "core" | "hub" | "leaf" | "ghost" | "tag";
interface P { x: number; y: number; vx: number; vy: number; ax: number; ay: number }

const CX = 800;
const CY = 500;

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
  const groupOf = (n: GraphNode): string | null => {
    if (hubIds.has(n.id)) return n.id;
    for (const nb of adj.get(n.id) ?? []) if (hubIds.has(nb)) return nb;
    return null;
  };
  return { adj, coreId, hubIds, roleOf, groupOf };
}

function anchors(nodes: GraphNode[], a: ReturnType<typeof analyze>): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  if (a.coreId) pos.set(a.coreId, { x: CX, y: CY });
  const hubs = nodes.filter((n) => a.roleOf(n) === "hub");
  hubs.forEach((h, i) => {
    const ang = (i / Math.max(1, hubs.length)) * Math.PI * 2 - Math.PI / 2;
    pos.set(h.id, { x: CX + Math.cos(ang) * 210, y: CY + Math.sin(ang) * 210 });
  });
  const hubSet = new Set(hubs.map((h) => h.id));
  const byHub = new Map<string, GraphNode[]>();
  const orphans: GraphNode[] = [];
  for (const n of nodes) {
    const r = a.roleOf(n);
    if (r === "core" || r === "hub") continue;
    let hub: string | null = null;
    for (const nb of a.adj.get(n.id) ?? []) if (hubSet.has(nb)) { hub = nb; break; }
    if (hub) (byHub.get(hub) ?? byHub.set(hub, []).get(hub)!).push(n);
    else orphans.push(n);
  }
  for (const [hubId, kids] of byHub) {
    const hp = pos.get(hubId)!;
    const out = Math.atan2(hp.y - CY, hp.x - CX);
    kids.forEach((k, i) => {
      const ang = out + (i - (kids.length - 1) / 2) * 0.5;
      pos.set(k.id, { x: hp.x + Math.cos(ang) * (150 + (i % 2) * 26), y: hp.y + Math.sin(ang) * (150 + (i % 2) * 26) });
    });
  }
  orphans.forEach((n, i) => {
    const ang = (i / Math.max(1, orphans.length)) * Math.PI * 2;
    pos.set(n.id, { x: CX + Math.cos(ang) * 480, y: CY + Math.sin(ang) * 480 });
  });
  return pos;
}

export interface MemoryGraphViewProps {
  graph: Graph;
  filters?: GraphFilters;
  display?: GraphDisplay;
  forces?: GraphForces;
  selectedId?: string | null;
  onSelect?: (node: GraphNode) => void;
  onAddChild?: (node: GraphNode) => void;
  /** Bump `nonce` to recenter the view on `id`. */
  focusTarget?: { id: string; nonce: number } | null;
  className?: string;
}

export function MemoryGraphView({
  graph,
  filters = DEFAULT_FILTERS,
  display = DEFAULT_DISPLAY,
  forces = DEFAULT_FORCES,
  selectedId,
  onSelect,
  onAddChild,
  focusTarget,
  className,
}: MemoryGraphViewProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const edgesRef = useRef<SVGSVGElement | null>(null);
  const addRef = useRef<HTMLButtonElement | null>(null);

  const meta = useMemo(() => analyze(graph), [graph]);

  // Visible set after filters.
  const { nodes, edges } = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const hidden = new Set(filters.hiddenGroups);
    const ok = (n: GraphNode): boolean => {
      const r = meta.roleOf(n);
      if (r === "core") return true;
      if (r === "tag" && !filters.showTags) return false;
      if (r === "ghost" && !filters.showGhosts) return false;
      if (r === "leaf" && n.degree === 0 && !filters.showOrphans) return false;
      const g = meta.groupOf(n);
      if (g && hidden.has(g)) return false;
      if (q && !n.title.toLowerCase().includes(q)) return false;
      return true;
    };
    const vis = graph.nodes.filter(ok);
    const ids = new Set(vis.map((n) => n.id));
    return { nodes: vis, edges: graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target)) };
  }, [graph, filters, meta]);

  const posRef = useRef<Map<string, P>>(new Map());
  const view = useRef({ x: 0, y: 0, scale: 0.85 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);
  const coolRef = useRef(0);
  const displayRef = useRef(display);
  const forcesRef = useRef(forces);
  displayRef.current = display;
  forcesRef.current = forces;

  const nodeById = useCallback((id: string) => graph.nodes.find((n) => n.id === id) ?? null, [graph]);

  // Seed / preserve positions when the visible set changes.
  const anchorMap = useMemo(() => anchors(nodes, meta), [nodes, meta]);
  useMemo(() => {
    const next = new Map<string, P>();
    for (const n of nodes) {
      const a = anchorMap.get(n.id) ?? { x: CX, y: CY };
      const prev = posRef.current.get(n.id);
      next.set(n.id, prev ? { ...prev, ax: a.x, ay: a.y } : { x: a.x, y: a.y, vx: 0, vy: 0, ax: a.x, ay: a.y });
    }
    posRef.current = next;
    coolRef.current = 180; // settle the new layout
  }, [nodes, anchorMap]);

  const applyView = useCallback(() => {
    const w = worldRef.current;
    if (w) w.style.transform = `translate(${view.current.x}px, ${view.current.y}px) scale(${view.current.scale})`;
  }, []);

  const addSlot = useCallback((id: string) => {
    const p = posRef.current.get(id);
    if (!p) return null;
    const out = Math.atan2(p.y - CY, p.x - CX) || -Math.PI / 3;
    return { x: p.x + Math.cos(out) * 62, y: p.y + Math.sin(out) * 62 };
  }, []);

  const redrawEdges = useCallback(() => {
    const svg = edgesRef.current;
    if (!svg) return;
    const hov = hoverRef.current || selectedId || null;
    const hset = new Set<string>();
    if (hov) {
      hset.add(hov);
      for (const nb of meta.adj.get(hov) ?? []) hset.add(nb);
    }
    const arrows = displayRef.current.arrows;
    let html = arrows
      ? `<defs><marker id="mg-ar" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="currentColor" opacity="0.5"/></marker></defs>`
      : "";
    for (const e of edges) {
      const a = posRef.current.get(e.source);
      const b = posRef.current.get(e.target);
      if (!a || !b) continue;
      const hot = hov && hset.has(e.source) && hset.has(e.target);
      const mk = arrows ? ` marker-end="url(#mg-ar)"` : "";
      html += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="${hot ? "mg-edge-hot" : "mg-edge"}"${mk}/>`;
    }
    if (hoverRef.current) {
      const p = posRef.current.get(hoverRef.current);
      const slot = addSlot(hoverRef.current);
      const node = nodeById(hoverRef.current);
      if (p && slot && node && node.kind === "page")
        html += `<line x1="${p.x}" y1="${p.y}" x2="${slot.x}" y2="${slot.y}" class="mg-edge-temp"/>`;
    }
    svg.innerHTML = html;
  }, [edges, meta, selectedId, addSlot, nodeById]);

  const applyNode = useCallback((id: string) => {
    const p = posRef.current.get(id);
    const el = worldRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
    if (p && el) {
      el.style.setProperty("--x", `${p.x}px`);
      el.style.setProperty("--y", `${p.y}px`);
    }
  }, []);

  const applyAll = useCallback(() => {
    for (const id of posRef.current.keys()) applyNode(id);
    redrawEdges();
  }, [applyNode, redrawEdges]);

  const positionAdd = useCallback(() => {
    const btn = addRef.current;
    if (!btn) return;
    const hov = hoverRef.current;
    const slot = hov ? addSlot(hov) : null;
    const node = hov ? nodeById(hov) : null;
    if (slot && node && node.kind === "page" && onAddChild) {
      btn.style.setProperty("--x", `${slot.x}px`);
      btn.style.setProperty("--y", `${slot.y}px`);
      btn.classList.add("mg-add-visible");
    } else btn.classList.remove("mg-add-visible");
  }, [addSlot, nodeById, onAddChild]);

  // ── force simulation (damped, clamped) ─────────────────────
  const step = useCallback(() => {
    const f = forcesRef.current;
    const list = nodes.filter((n) => meta.roleOf(n) !== "core");
    const pm = posRef.current;
    const repel = (f.repel / 100) * 900;
    const centerF = f.center / 100;
    const linkF = f.link / 100;
    const desired = f.linkDistance;
    for (const n of list) {
      const p = pm.get(n.id);
      if (!p) continue;
      p.vx += (p.ax - p.x) * 0.003 * centerF;
      p.vy += (p.ay - p.y) * 0.003 * centerF;
    }
    for (let i = 0; i < list.length; i++) {
      const a = pm.get(list[i].id);
      if (!a) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = pm.get(list[j].id);
        if (!b) continue;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
        const force = Math.min(2.5, repel / d2);
        const d = Math.sqrt(d2);
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
    }
    for (const e of edges) {
      const a = pm.get(e.source);
      const b = pm.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const diff = (d - desired) * 0.006 * linkF;
      const fx = (dx / d) * diff;
      const fy = (dy / d) * diff;
      const ca = e.source === meta.coreId;
      const cb = e.target === meta.coreId;
      if (!ca) { a.vx += fx; a.vy += fy; }
      if (!cb) { b.vx -= fx; b.vy -= fy; }
    }
    for (const n of list) {
      const p = pm.get(n.id);
      if (!p) continue;
      p.vx *= 0.85; p.vy *= 0.85;
      const v = Math.hypot(p.vx, p.vy);
      if (v > 8) { p.vx = (p.vx / v) * 8; p.vy = (p.vy / v) * 8; }
      p.x += p.vx; p.y += p.vy;
    }
  }, [nodes, edges, meta]);

  useEffect(() => {
    const loop = () => {
      const animate = forcesRef.current.animate;
      if (!animate && coolRef.current <= 0) { rafRef.current = 0; return; }
      step();
      if (!animate) coolRef.current -= 1;
      applyAll();
      positionAdd();
      rafRef.current = requestAnimationFrame(loop);
    };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [step, applyAll, positionAdd, nodes, forces.animate]);

  // Display → CSS vars (no re-render).
  useEffect(() => {
    const w = worldRef.current;
    if (!w) return;
    w.style.setProperty("--mg-scale", String(display.nodeSize / 100));
    w.style.setProperty("--mg-link", String((display.linkThickness / 100) * 1.2));
    const fade = Math.max(0.35, Math.min(1, view.current.scale / (0.5 + (display.textFade / 100) * 0.9)));
    w.style.setProperty("--mg-pill", fade.toFixed(2));
  }, [display]);

  useLayoutEffect(() => {
    applyView();
    applyAll();
    const stage = stageRef.current;
    if (stage) {
      const r = stage.getBoundingClientRect();
      view.current.x = r.width / 2 - CX * view.current.scale;
      view.current.y = r.height / 2 - CY * view.current.scale;
      applyView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // Focus request → recenter.
  useEffect(() => {
    if (!focusTarget) return;
    const p = posRef.current.get(focusTarget.id);
    const stage = stageRef.current;
    if (p && stage) {
      const r = stage.getBoundingClientRect();
      view.current.scale = Math.max(view.current.scale, 1);
      view.current.x = r.width / 2 - p.x * view.current.scale;
      view.current.y = r.height / 2 - p.y * view.current.scale;
      applyView();
    }
  }, [focusTarget, applyView]);

  // ── pan / zoom / drag ──────────────────────────────────────
  const drag = useRef<{ mode: "pan" | "node" | null; id?: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }>({
    mode: null, sx: 0, sy: 0, ox: 0, oy: 0, moved: false,
  });

  const onDown = (e: React.PointerEvent) => {
    const nodeEl = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
    if (nodeEl) {
      const id = nodeEl.dataset.id!;
      const p = posRef.current.get(id);
      if (p) {
        drag.current = { mode: "node", id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
    }
    drag.current = { mode: "pan", sx: e.clientX, sy: e.clientY, ox: view.current.x, oy: view.current.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.mode) return;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 3) d.moved = true;
    if (d.mode === "pan") {
      view.current.x = d.ox + (e.clientX - d.sx);
      view.current.y = d.oy + (e.clientY - d.sy);
      applyView();
    } else if (d.mode === "node" && d.id) {
      const s = view.current.scale;
      const p = posRef.current.get(d.id);
      if (p) {
        p.x = d.ox + (e.clientX - d.sx) / s;
        p.y = d.oy + (e.clientY - d.sy) / s;
        p.ax = p.x; p.ay = p.y; p.vx = 0; p.vy = 0;
        applyNode(d.id);
        redrawEdges();
        positionAdd();
      }
    }
  };
  const onUp = () => { drag.current.mode = null; };

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
  const clearHide = () => { if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = null; };
  const enter = (id: string) => { clearHide(); hoverRef.current = id; setHoverId(id); positionAdd(); redrawEdges(); };
  const leave = () => {
    clearHide();
    hideTimer.current = setTimeout(() => { hoverRef.current = null; setHoverId(null); positionAdd(); redrawEdges(); }, 160);
  };
  useEffect(() => { positionAdd(); }, [hoverId, positionAdd]);

  return (
    <div
      ref={stageRef}
      className={cn("relative h-full w-full touch-none overflow-hidden", className)}
      style={{ cursor: "grab" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onWheel={onWheel}
    >
      <style>{MG_CSS}</style>
      <div ref={worldRef} className="mg-world absolute left-0 top-0" style={{ width: 1600, height: 1000 }}>
        <svg ref={edgesRef} className="mg-edges absolute inset-0 overflow-visible text-foreground" viewBox="0 0 1600 1000" aria-hidden />
        {nodes.map((n) => {
          const role = meta.roleOf(n);
          const cls = `mg-node mg-${role}${hoverId === n.id ? " mg-hover" : ""}${selectedId === n.id ? " mg-selected" : ""}`;
          const label = n.title || "Untitled";
          const handlers = {
            onPointerEnter: () => enter(n.id),
            onPointerLeave: leave,
            onClick: (e: React.MouseEvent) => { e.stopPropagation(); if (!drag.current.moved) onSelect?.(n); },
          };
          if (role === "core")
            return <button key={n.id} data-id={n.id} type="button" className={cls} aria-label={label} {...handlers} />;
          if (role === "hub")
            return (
              <button key={n.id} data-id={n.id} type="button" className={cls} aria-label={label} {...handlers}>
                {n.icon ? <span className="mg-icon">{n.icon}</span> : <span className="mg-icon"><Folder /></span>}
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
          onPointerLeave={leave}
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

const MG_CSS = `
.mg-world{transform-origin:0 0;will-change:transform;--mg-scale:1;--mg-link:1.2;--mg-pill:.72}
.mg-edges line{vector-effect:non-scaling-stroke}
.mg-edge{stroke:var(--border);stroke-width:calc(1.1 * var(--mg-link))}
.mg-edge-hot{stroke:color-mix(in srgb, var(--primary) 80%, transparent);stroke-width:calc(1.5 * var(--mg-link))}
.mg-edge-temp{stroke:color-mix(in srgb, var(--primary) 55%, transparent);stroke-width:1.6;stroke-dasharray:4 5}
.mg-node{position:absolute;left:var(--x,0);top:var(--y,0);transform:translate(-50%,-50%);border:0;background:transparent;padding:0;cursor:pointer;user-select:none;touch-action:none}
.mg-core{width:calc(56px * var(--mg-scale));height:calc(56px * var(--mg-scale));border-radius:999px;cursor:grab;
  background:radial-gradient(circle at 50% 50%, color-mix(in srgb,var(--primary) 92%, white) 0 22%, color-mix(in srgb,var(--primary) 70%, transparent) 40%, color-mix(in srgb,var(--primary) 22%, transparent) 68%, transparent 100%);
  box-shadow:0 0 26px color-mix(in srgb,var(--primary) 30%, transparent), 0 12px 40px rgba(0,0,0,.25)}
.mg-hub{width:calc(34px * var(--mg-scale));height:calc(34px * var(--mg-scale));display:grid;place-items:center;border-radius:calc(11px * var(--mg-scale));cursor:grab;
  background:color-mix(in srgb,var(--card) 90%, transparent);border:1px solid var(--border);color:var(--foreground);
  box-shadow:0 8px 22px rgba(0,0,0,.16);transition:transform .15s ease,border-color .15s ease}
.mg-hub:hover,.mg-hub.mg-hover,.mg-hub.mg-selected{transform:translate(-50%,-50%) scale(1.08);border-color:color-mix(in srgb,var(--primary) 45%, var(--border))}
.mg-icon{font-size:calc(16px * var(--mg-scale));line-height:1;display:grid;place-items:center}
.mg-icon svg{width:calc(17px * var(--mg-scale));height:calc(17px * var(--mg-scale))}
.mg-icon-sm{font-size:11px;margin-right:2px}
.mg-leaf,.mg-tag{min-width:64px;height:calc(24px * var(--mg-scale));padding:0 12px;display:flex;align-items:center;gap:4px;border-radius:999px;white-space:nowrap;
  font-size:calc(11px * var(--mg-scale));font-weight:600;letter-spacing:-.01em;
  color:var(--muted-foreground);background:color-mix(in srgb,var(--muted) 55%, transparent);border:1px solid transparent;
  opacity:var(--mg-pill);transition:opacity .15s ease,transform .15s ease,color .15s ease,background .15s ease,border-color .15s ease}
.mg-leaf:hover,.mg-leaf.mg-hover,.mg-leaf.mg-selected,.mg-tag:hover,.mg-tag.mg-hover,.mg-tag.mg-selected{opacity:1;color:var(--foreground);transform:translate(-50%,-50%) scale(1.05);
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
