"use client";

/** DOM + SVG knowledge graph — purpose-built (no canvas lib) so page ICONS
 *  render natively and colours stay theme-token dynamic.
 *
 *  Obsidian-style FREE-FLOATING CLOUD: no imposed core/hub/leaf hierarchy.
 *  Every page is an equal icon-disc sized by degree; clusters emerge purely
 *  from links. Pages · icon-disc leaves · #tag chips · dashed ghost discs ·
 *  database discs. SVG connectors (highlight on hover). Pan (drag bg) · zoom
 *  (wheel) · drag nodes · hover a page for a "+" that adds a child. A damped
 *  force sim (repel + link springs + gentle pull to centre, driven by the
 *  Forces sliders) settles the layout; "Animate" keeps it live.
 *
 *  Positions live in a ref and are applied imperatively (CSS vars + SVG attrs)
 *  so pan/zoom/drag/sim never re-render the node list.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { cn } from "@/shared/lib/utils";
import type { Graph, GraphNode } from "@/shared/types/graph";
import {
  DEFAULT_DISPLAY,
  DEFAULT_FILTERS,
  DEFAULT_FORCES,
  componentOf,
  type GraphDisplay,
  type GraphFilters,
  type GraphForces,
} from "../lib/graphSettings";

type Role = "page" | "ghost" | "tag" | "database";
interface P { x: number; y: number; vx: number; vy: number }

const CX = 800;
const CY = 500;

// Simulation temperature (d3-force-style alpha): scales every injected force,
// decays toward a target, self-stops when frozen, reheats on interaction.
const ALPHA_MIN = 0.02;   // below this (with Animate off) the loop freezes
const ALPHA_DECAY = 0.02; // per-frame approach rate toward the target
const ALPHA_FLOOR = 0.06; // Animate ON holds here → perpetual gentle breathing
const REHEAT = 0.7;       // energy injected on a control/node change
const DRAG_ALPHA = 0.4;   // energy while dragging a node
const JITTER = 0.6;       // brownian kick (×alpha) that makes Animate visible

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
  const rep = componentOf(graph); // node id → its cluster representative
  const roleOf = (n: GraphNode): Role =>
    n.kind === "ghost" ? "ghost" : n.kind === "tag" ? "tag" : n.kind === "database" ? "database" : "page";
  // Group = connected component (hierarchy-free); powers the hide-cluster filter.
  const groupOf = (n: GraphNode): string | null => rep.get(n.id) ?? null;
  return { adj, roleOf, groupOf };
}

/** Deterministic phyllotaxis (golden-angle) spread around centre — a spacious
 *  seed the force sim then refines into link-driven clusters. */
function seed(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const golden = Math.PI * (3 - Math.sqrt(5));
  nodes.forEach((n, i) => {
    const r = 34 * Math.sqrt(i + 0.5);
    const a = i * golden;
    pos.set(n.id, { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
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
  /** Bump to re-energize the simulation (Reheat button). */
  reheatNonce?: number;
  /** Bump to frame the whole graph (Zoom-to-fit button). */
  fitNonce?: number;
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
  reheatNonce,
  fitNonce,
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
      if (r === "database" && !filters.showDatabases) return false;
      if (r === "tag" && !filters.showTags) return false;
      if (r === "ghost" && !filters.showGhosts) return false;
      if (r === "page" && n.degree === 0 && !filters.showOrphans) return false;
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
  const alphaRef = useRef(1);                     // seed hot so first mount settles
  const dragIdRef = useRef<string | null>(null);  // pinned anchor while dragging
  const displayRef = useRef(display);
  const forcesRef = useRef(forces);
  displayRef.current = display;
  forcesRef.current = forces;

  const nodeById = useCallback((id: string) => graph.nodes.find((n) => n.id === id) ?? null, [graph]);

  // Per-node mass + collision radius. Hubs (high degree) get more mass so they
  // anchor while leaves swing; radius mirrors the CSS disc so discs never stack.
  const sim = useMemo(() => {
    const mass = new Map<string, number>();
    const rad = new Map<string, number>();
    for (const n of nodes) {
      const d = n.degree || 0;
      mass.set(n.id, 1 + Math.sqrt(d));
      rad.set(n.id, Math.min(54, Math.max(18, 20 + d * 2.4)) / 2);
    }
    return { mass, rad };
  }, [nodes]);
  const simRef = useRef(sim);
  simRef.current = sim;

  // Categorical hue per connected-component (golden-angle spread) — powers the
  // optional "Colour groups" tint so clusters read at a glance (Obsidian-style).
  const tint = useMemo(() => {
    const reps: string[] = [];
    const seen = new Set<string>();
    for (const n of graph.nodes) {
      const g = meta.groupOf(n);
      if (g && !seen.has(g)) { seen.add(g); reps.push(g); }
    }
    const m = new Map<string, number>();
    reps.forEach((r, i) => m.set(r, Math.round((i * 137.5) % 360)));
    return m;
  }, [graph, meta]);

  // Seed / preserve positions when the visible set changes.
  const seedMap = useMemo(() => seed(nodes), [nodes]);
  useMemo(() => {
    const next = new Map<string, P>();
    for (const n of nodes) {
      const s = seedMap.get(n.id) ?? { x: CX, y: CY };
      const prev = posRef.current.get(n.id);
      next.set(n.id, prev ?? { x: s.x, y: s.y, vx: 0, vy: 0 });
    }
    posRef.current = next;
    alphaRef.current = 1; // reheat fully to settle the new layout
  }, [nodes, seedMap]);

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
      const base = e.kind === "relation" ? "mg-edge-rel" : e.kind === "db-row" ? "mg-edge-db" : "mg-edge";
      // When a node is focused, non-neighbour edges dim rather than vanish.
      const cls = hot ? "mg-edge-hot" : hov ? `${base} mg-edge-dim` : base;
      // Gentle quadratic arc — control point perpendicular to the chord.
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, bow = Math.min(26, len * 0.14);
      const mx = (a.x + b.x) / 2 + (-dy / len) * bow;
      const my = (a.y + b.y) / 2 + (dx / len) * bow;
      html += `<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}" class="${cls}"${mk}/>`;
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

  // Dim every node NOT in the focus neighbourhood (focus + direct neighbours).
  // Imperative DOM toggle — off the per-frame render path, like everything else.
  const applyFocus = useCallback((focus: string | null) => {
    const w = worldRef.current;
    if (!w) return;
    const els = w.querySelectorAll<HTMLElement>("[data-id]");
    const keep = new Set<string>();
    if (focus) {
      keep.add(focus);
      for (const nb of meta.adj.get(focus) ?? []) keep.add(nb);
    }
    // Only dim if the focus node is actually rendered — a selected node that
    // got filtered out must NOT dim the whole graph.
    const active = !!focus && Array.from(els).some((el) => el.dataset.id === focus);
    els.forEach((el) => {
      el.classList.toggle("mg-dim", active && !keep.has(el.dataset.id ?? ""));
    });
  }, [meta]);

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

  // ── force simulation (free cloud: repel + link springs + centre pull) ──
  // Every injected force scales by `alpha` (temperature); collision is
  // position-based (unscaled) so discs never overlap even at rest. Increments
  // divide by node mass so hubs anchor and leaves swing.
  const step = useCallback((alpha: number) => {
    const f = forcesRef.current;
    const pm = posRef.current;
    const animate = f.animate;
    const dragId = dragIdRef.current;
    const { mass, rad } = simRef.current;
    const nodeScale = displayRef.current.nodeSize / 100;
    const repel = (f.repel / 100) * 900;
    const centerF = f.center / 100;
    const linkF = f.link / 100;
    const desired = f.linkDistance;
    // gentle isotropic pull to one centre — disconnected islands settle in a
    // ring where repel balances it.
    for (const n of nodes) {
      const p = pm.get(n.id);
      if (!p) continue;
      const m = mass.get(n.id) || 1;
      p.vx += ((CX - p.x) * 0.0016 * centerF * alpha) / m;
      p.vy += ((CY - p.y) * 0.0016 * centerF * alpha) / m;
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = pm.get(nodes[i].id);
      if (!a) continue;
      const ma = mass.get(nodes[i].id) || 1;
      const ra = (rad.get(nodes[i].id) || 10) * nodeScale;
      for (let j = i + 1; j < nodes.length; j++) {
        const b = pm.get(nodes[j].id);
        if (!b) continue;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
        const d = Math.sqrt(d2);
        const ux = dx / d, uy = dy / d;
        const force = Math.min(2.5, repel / d2) * alpha;
        const mb = mass.get(nodes[j].id) || 1;
        a.vx += (ux * force) / ma; a.vy += (uy * force) / ma;
        b.vx -= (ux * force) / mb; b.vy -= (uy * force) / mb;
        // hard collision (unscaled by alpha → holds at rest)
        const minD = ra + (rad.get(nodes[j].id) || 10) * nodeScale + 6;
        if (d < minD) {
          const push = (minD - d) * 0.5;
          a.x += ux * push; a.y += uy * push;
          b.x -= ux * push; b.y -= uy * push;
        }
      }
    }
    for (const e of edges) {
      const a = pm.get(e.source);
      const b = pm.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const diff = (d - desired) * 0.006 * linkF * alpha;
      const ux = dx / d, uy = dy / d;
      const ma = mass.get(e.source) || 1, mb = mass.get(e.target) || 1;
      a.vx += (ux * diff) / ma; a.vy += (uy * diff) / ma;
      b.vx -= (ux * diff) / mb; b.vy -= (uy * diff) / mb;
    }
    for (const n of nodes) {
      const p = pm.get(n.id);
      if (!p) continue;
      if (n.id === dragId) { p.vx = 0; p.vy = 0; continue; } // fixed anchor
      if (animate) {
        p.vx += (Math.random() - 0.5) * JITTER * alpha;
        p.vy += (Math.random() - 0.5) * JITTER * alpha;
      }
      p.vx *= 0.85; p.vy *= 0.85;
      const v = Math.hypot(p.vx, p.vy);
      if (v > 8) { p.vx = (p.vx / v) * 8; p.vy = (p.vy / v) * 8; }
      p.x += p.vx; p.y += p.vy;
    }
  }, [nodes, edges]);

  // The sim runs while `animate` is on OR while there's residual "cool" (a
  // settle budget); it self-stops when idle. `loopRef` always holds the latest
  // closure (step/applyAll change identity with nodes/edges), and
  // `ensureRunning` restarts a stopped loop so the control effects below can
  // wake a settled graph.
  const loopRef = useRef<() => void>(() => {});
  loopRef.current = () => {
    const animate = forcesRef.current.animate;
    const target = animate ? ALPHA_FLOOR : 0;
    alphaRef.current += (target - alphaRef.current) * ALPHA_DECAY;
    // Animate OFF + cooled below the floor → freeze (a genuine Pause).
    if (!animate && alphaRef.current < ALPHA_MIN) { alphaRef.current = 0; rafRef.current = 0; return; }
    step(alphaRef.current);
    applyAll();
    positionAdd();
    rafRef.current = requestAnimationFrame(() => loopRef.current());
  };
  const ensureRunning = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(() => loopRef.current());
  }, []);
  const reheat = useCallback((a = REHEAT) => {
    alphaRef.current = Math.max(alphaRef.current, a);
    ensureRunning();
  }, [ensureRunning]);

  // Cancel the RAF on unmount only.
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  // Reheat so a settled graph visibly re-flows on any node-set or Forces edit
  // (works even while paused → the controls always respond).
  useEffect(() => { reheat(); }, [nodes, forces.center, forces.repel, forces.link, forces.linkDistance, reheat]);
  // Toggling Animate ON reheats so you SEE it wake; OFF runs the loop down to
  // the freeze threshold. The `animate` flag also drives per-frame breathing.
  useEffect(() => {
    if (forces.animate) reheat();
    else ensureRunning();
  }, [forces.animate, reheat, ensureRunning]);

  // Explicit Reheat button (ControlPanel) — re-energize on demand.
  useEffect(() => { if (reheatNonce) reheat(1); }, [reheatNonce, reheat]);

  // Arrows toggle repaints edges immediately (the loop may be idle).
  useEffect(() => { redrawEdges(); }, [display.arrows, redrawEdges]);

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

  // Zoom-to-fit: frame the whole node cloud with padding.
  const fit = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of posRef.current.values()) {
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
    }
    if (!isFinite(minX)) return;
    const r = stage.getBoundingClientRect(), pad = 90;
    const s = Math.min(1.6, Math.max(0.35, Math.min(
      (r.width - pad * 2) / (maxX - minX || 1),
      (r.height - pad * 2) / (maxY - minY || 1),
    )));
    view.current.scale = s;
    view.current.x = r.width / 2 - ((minX + maxX) / 2) * s;
    view.current.y = r.height / 2 - ((minY + maxY) / 2) * s;
    applyView();
    applyAll();
  }, [applyView, applyAll]);
  useEffect(() => { if (fitNonce) fit(); }, [fitNonce, fit]);

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
        dragIdRef.current = id; // pin: the sim treats it as a fixed anchor
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
        p.vx = 0; p.vy = 0;
        alphaRef.current = Math.max(alphaRef.current, DRAG_ALPHA); // keep neighbours settling
        ensureRunning();
        applyNode(d.id);
        redrawEdges();
        positionAdd();
      }
    }
  };
  const onUp = () => {
    if (drag.current.mode === "node") { dragIdRef.current = null; reheat(DRAG_ALPHA); } // unpin + settle
    drag.current.mode = null;
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
  const clearHide = () => { if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = null; };
  const enter = (id: string) => { clearHide(); hoverRef.current = id; setHoverId(id); positionAdd(); redrawEdges(); applyFocus(id); };
  const leave = () => {
    clearHide();
    hideTimer.current = setTimeout(() => {
      hoverRef.current = null; setHoverId(null); positionAdd(); redrawEdges();
      applyFocus(selectedId ?? null); // fall back to the selected node's neighbourhood
    }, 160);
  };
  useEffect(() => { positionAdd(); }, [hoverId, positionAdd]);
  // Selection change (from the Inspector / click) re-applies focus dimming.
  useEffect(() => { applyFocus(hoverRef.current ?? selectedId ?? null); }, [selectedId, nodes, applyFocus]);

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
          const cls = `mg-node mg-${role}${n.hub ? " mg-verified" : ""}${hoverId === n.id ? " mg-hover" : ""}${selectedId === n.id ? " mg-selected" : ""}${display.colorGroups ? " mg-tinted" : ""}`;
          const label = n.title || "Untitled";
          const hue = tint.get(meta.groupOf(n) ?? "") ?? 0;
          const degStyle = { "--deg": n.degree, "--mg-hue": hue } as React.CSSProperties;
          const handlers = {
            onPointerEnter: () => enter(n.id),
            onPointerLeave: leave,
            onClick: (e: React.MouseEvent) => { e.stopPropagation(); if (!drag.current.moved) onSelect?.(n); },
          };
          if (role === "tag")
            return (
              <button key={n.id} data-id={n.id} type="button" className={cls} title={label} {...handlers}>
                #{label.replace(/^#?/, "")}
              </button>
            );
          // page · ghost · database → icon-disc + label, sized by degree.
          return (
            <button key={n.id} data-id={n.id} type="button" className={cls} style={degStyle} aria-label={label} {...handlers}>
              <span className="mg-disc">
                <DynamicIcon value={n.icon} fallback={role === "database" ? "lucide:Database" : role === "ghost" ? "○" : "📄"} className="mg-icon" />
              </span>
              <span className="mg-label">{label}</span>
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
.mg-edges line,.mg-edges path{vector-effect:non-scaling-stroke}
.mg-edges path{fill:none;stroke-linecap:round;transition:opacity .18s ease,stroke .18s ease}
.mg-edge{stroke:var(--border);stroke-width:calc(1.1 * var(--mg-link))}
.mg-edge-hot{stroke:color-mix(in srgb, var(--primary) 85%, transparent);stroke-width:calc(1.7 * var(--mg-link));filter:drop-shadow(0 0 3px color-mix(in srgb,var(--primary) 40%, transparent))}
.mg-edge-temp{stroke:color-mix(in srgb, var(--primary) 55%, transparent);stroke-width:1.6;stroke-dasharray:4 5}
.mg-edge-db{stroke:color-mix(in srgb, var(--primary) 45%, var(--border));stroke-width:calc(1.3 * var(--mg-link))}
.mg-edge-rel{stroke:color-mix(in srgb, var(--primary) 60%, transparent);stroke-width:calc(1.2 * var(--mg-link));stroke-dasharray:5 4}
.mg-edge-dim{opacity:.12}
.mg-node{position:absolute;left:var(--x,0);top:var(--y,0);transform:translate(-50%,-50%);border:0;background:transparent;padding:0;cursor:grab;user-select:none;touch-action:none;display:flex;flex-direction:column;align-items:center;transition:opacity .18s ease}
.mg-dim{opacity:.28;filter:saturate(.55)}
.mg-dim .mg-label{opacity:.08}
.mg-disc{--d:calc(clamp(18px, 20px + var(--deg,0) * 2.4px, 54px) * var(--mg-scale));width:var(--d);height:var(--d);border-radius:999px;display:grid;place-items:center;
  background:color-mix(in srgb,var(--card) 92%, transparent);border:1px solid var(--border);color:var(--foreground);
  box-shadow:0 4px 14px rgba(0,0,0,.14);transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
.mg-icon{font-size:calc(var(--d,22px) * .5);line-height:1;display:grid;place-items:center}
.mg-label{margin-top:4px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font-size:calc(11px * var(--mg-scale));font-weight:600;letter-spacing:-.01em;color:var(--muted-foreground);
  opacity:var(--mg-pill);pointer-events:none;transition:opacity .15s ease,color .15s ease}
.mg-node:hover .mg-disc,.mg-hover .mg-disc,.mg-selected .mg-disc{transform:scale(1.09);border-color:color-mix(in srgb,var(--primary) 45%, var(--border));box-shadow:0 8px 22px rgba(0,0,0,.2)}
.mg-node:hover .mg-label,.mg-hover .mg-label,.mg-selected .mg-label{opacity:1;color:var(--foreground)}
.mg-verified .mg-disc{border-color:color-mix(in srgb,var(--primary) 55%, var(--border));box-shadow:0 0 0 1px color-mix(in srgb,var(--primary) 35%, transparent),0 6px 18px rgba(0,0,0,.18)}
.mg-database .mg-disc{border-radius:calc(12px * var(--mg-scale))}
.mg-ghost .mg-disc{border-style:dashed;color:var(--muted-foreground);opacity:.7}
.mg-ghost .mg-label{font-style:italic;opacity:calc(var(--mg-pill) * .8)}
.mg-tinted .mg-disc{border-color:color-mix(in srgb, hsl(var(--mg-hue,0) 60% 55%) 60%, var(--border))}
.mg-tinted .mg-icon{color:color-mix(in srgb, hsl(var(--mg-hue,0) 60% 55%) 65%, var(--foreground))}
.mg-tinted.mg-hover .mg-disc,.mg-tinted.mg-selected .mg-disc,.mg-tinted .mg-disc:hover{border-color:hsl(var(--mg-hue,0) 65% 55%)}
@keyframes mg-pulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--primary) 30%, transparent),0 8px 22px rgba(0,0,0,.2)}50%{box-shadow:0 0 0 5px color-mix(in srgb,var(--primary) 10%, transparent),0 8px 22px rgba(0,0,0,.2)}}
.mg-selected .mg-disc{animation:mg-pulse 1.8s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.mg-selected .mg-disc{animation:none}}
.mg-tag{min-width:44px;height:calc(24px * var(--mg-scale));padding:0 12px;display:flex;flex-direction:row;align-items:center;border-radius:999px;white-space:nowrap;
  font-size:calc(11px * var(--mg-scale));font-weight:600;letter-spacing:-.01em;color:var(--primary);
  background:color-mix(in srgb,var(--primary) 12%, transparent);border:1px solid transparent;
  opacity:var(--mg-pill);transition:opacity .15s ease,transform .15s ease,border-color .15s ease}
.mg-tag:hover,.mg-tag.mg-hover,.mg-tag.mg-selected{opacity:1;transform:translate(-50%,-50%) scale(1.06);border-color:color-mix(in srgb,var(--primary) 35%, var(--border))}
.mg-add{position:absolute;left:var(--x,0);top:var(--y,0);transform:translate(-50%,-50%) scale(.9);width:30px;height:30px;border-radius:999px;flex-direction:row;
  display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--primary) 40%, var(--border));
  background:color-mix(in srgb,var(--background) 70%, var(--primary) 12%);color:var(--foreground);
  box-shadow:0 10px 26px rgba(0,0,0,.3);cursor:pointer;opacity:0;pointer-events:none;transition:opacity .14s ease,transform .14s ease;z-index:8}
.mg-add.mg-add-visible{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}
.mg-add:hover{transform:translate(-50%,-50%) scale(1.1)}
`;
