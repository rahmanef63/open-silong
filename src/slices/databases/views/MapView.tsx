import { useMemo, useState } from "react";
import { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ChevronDown, MapPin } from "lucide-react";

const COLOR_HEX: Record<string, string> = {
  gray: "#6b7280",
  brown: "#a16207",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#10b981",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
  red: "#ef4444",
};

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

const VW = 720;
const VH = 360;

function project(lat: number, lng: number): { x: number; y: number } {
  const cLat = Math.max(-85, Math.min(85, lat));
  const cLng = Math.max(-180, Math.min(180, lng));
  return {
    x: ((cLng + 180) / 360) * VW,
    y: ((90 - cLat) / 180) * VH,
  };
}

/** Rough continent outlines (equirectangular) — decorative, not geographically precise. */
const CONTINENTS = [
  // North America
  "M 100 80 L 170 70 L 210 95 L 230 130 L 200 165 L 160 175 L 140 155 L 120 130 Z",
  // South America
  "M 200 200 L 245 195 L 260 230 L 250 280 L 220 300 L 205 270 Z",
  // Europe
  "M 350 90 L 410 85 L 425 110 L 405 130 L 365 125 L 350 105 Z",
  // Africa
  "M 360 145 L 425 140 L 445 195 L 420 250 L 380 240 L 360 195 Z",
  // Asia
  "M 430 80 L 580 75 L 620 110 L 615 165 L 555 175 L 480 160 L 440 130 Z",
  // Oceania
  "M 555 230 L 620 225 L 640 255 L 605 270 L 570 260 Z",
  // Greenland
  "M 290 50 L 320 45 L 335 75 L 310 90 L 285 75 Z",
];

export function MapView({ db, view, rows, onOpenRow }: Props) {
  const { updateView } = useStore();
  const numProps = useMemo(() => db.properties.filter(p => p.type === "number"), [db.properties]);

  const latProp = useMemo(
    () => db.properties.find(p => p.id === view.mapLatProp && p.type === "number")
      ?? db.properties.find(p => p.type === "number" && /lat/i.test(p.name))
      ?? numProps[0],
    [db.properties, view.mapLatProp, numProps],
  );
  const lngProp = useMemo(
    () => db.properties.find(p => p.id === view.mapLngProp && p.type === "number")
      ?? db.properties.find(p => p.type === "number" && /(lng|lon)/i.test(p.name))
      ?? numProps.find(p => p.id !== latProp?.id),
    [db.properties, view.mapLngProp, numProps, latProp],
  );

  const colorProp = useMemo(
    () => db.properties.find(p => p.id === view.mapPinColorProp && (p.type === "select" || p.type === "status")),
    [db.properties, view.mapPinColorProp],
  );

  const pins = useMemo(() => {
    if (!latProp || !lngProp) return [] as { row: Page; x: number; y: number; lat: number; lng: number; color: string }[];
    const out: { row: Page; x: number; y: number; lat: number; lng: number; color: string }[] = [];
    for (const r of rows) {
      const lat = Number(r.rowProps?.[latProp.id]);
      const lng = Number(r.rowProps?.[lngProp.id]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const { x, y } = project(lat, lng);
      const opt = colorProp ? colorProp.options?.find(o => o.id === r.rowProps?.[colorProp.id]) : null;
      const color = (opt && COLOR_HEX[opt.color ?? "gray"]) ?? "hsl(var(--brand))";
      out.push({ row: r, x, y, lat, lng, color });
    }
    return out;
  }, [rows, latProp, lngProp, colorProp]);

  const showList = view.mapShowList ?? true;

  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <PropPicker
          label="Latitude"
          value={latProp?.name ?? "—"}
          props={numProps}
          onPick={(id) => updateView(db.id, view.id, { mapLatProp: id })}
        />
        <PropPicker
          label="Longitude"
          value={lngProp?.name ?? "—"}
          props={numProps.filter(p => p.id !== latProp?.id)}
          onPick={(id) => updateView(db.id, view.id, { mapLngProp: id })}
        />
        <span className="ml-auto text-muted-foreground">
          {pins.length} of {rows.length} pinned
        </span>
      </div>

      {(!latProp || !lngProp) ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Add two number properties for latitude and longitude to plot rows on the map.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-[hsl(var(--accent)/0.3)]">
          <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto block" role="img" aria-label="World map">
            {/* Ocean */}
            <rect width={VW} height={VH} fill="hsl(var(--muted))" />
            {/* Graticule */}
            {Array.from({ length: 13 }, (_, i) => (
              <line
                key={`v${i}`}
                x1={(i / 12) * VW} y1={0}
                x2={(i / 12) * VW} y2={VH}
                stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="2 4"
              />
            ))}
            {Array.from({ length: 7 }, (_, i) => (
              <line
                key={`h${i}`}
                x1={0} y1={(i / 6) * VH}
                x2={VW} y2={(i / 6) * VH}
                stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="2 4"
              />
            ))}
            {/* Equator emphasis */}
            <line x1={0} y1={VH / 2} x2={VW} y2={VH / 2} stroke="hsl(var(--border))" strokeWidth={1} />
            {/* Continents */}
            {CONTINENTS.map((d, i) => (
              <path key={i} d={d} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1} />
            ))}
            {/* Pins */}
            {pins.map(({ row, x, y, color }) => {
              const isHover = hover === row.id;
              return (
                <g
                  key={row.id}
                  transform={`translate(${x},${y})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHover(row.id)}
                  onMouseLeave={() => setHover((h) => (h === row.id ? null : h))}
                  onClick={() => onOpenRow(row.id)}
                >
                  <circle r={isHover ? 7 : 5} fill={color} stroke="white" strokeWidth={1.5} className="transition-all" />
                  <circle r={isHover ? 14 : 10} fill={color} opacity={0.2} />
                </g>
              );
            })}
          </svg>
          {/* Hover label */}
          {hover && (() => {
            const p = pins.find(x => x.row.id === hover);
            if (!p) return null;
            return (
              <div className="px-3 py-2 border-t border-border bg-card text-xs flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-brand" />
                <span className="font-medium">{p.row.icon} {p.row.title || "Untitled"}</span>
                <span className="text-muted-foreground tabular-nums">
                  {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* List fallback for accessibility / dense maps */}
      {showList && pins.length > 0 && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border max-h-48 overflow-y-auto">
          {pins.map(p => (
            <button
              key={p.row.id}
              onClick={() => onOpenRow(p.row.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent/50 text-xs"
            >
              <MapPin className="h-3 w-3 shrink-0" style={{ color: p.color }} />
              <span className="flex-1 truncate">{p.row.icon} {p.row.title || "Untitled"}</span>
              <span className="text-muted-foreground tabular-nums">{p.lat.toFixed(2)}, {p.lng.toFixed(2)}</span>
            </button>
          ))}
        </div>
      )}

      {colorProp && colorProp.options && colorProp.options.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <span>Legend:</span>
          {colorProp.options.map(o => (
            <span key={o.id} className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_HEX[o.color ?? "gray"] }} />
              {o.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PropPicker({ label, value, props, onPick }: {
  label: string; value: string; props: Property[]; onPick: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 hover:bg-accent">
          <span className="text-muted-foreground">{label}:</span>
          <span className="font-medium">{value}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
        {props.length === 0 ? (
          <DropdownMenuItem disabled>Add a number property first</DropdownMenuItem>
        ) : props.map(p => (
          <DropdownMenuItem key={p.id} onClick={() => onPick(p.id)}>{p.name}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
