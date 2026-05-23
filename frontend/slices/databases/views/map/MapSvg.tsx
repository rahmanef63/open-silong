import { MapPin } from "lucide-react";
import { DynamicIcon } from "@/shared/components/icon-picker";
import type { Page } from "@/shared/types/domain";
import { CONTINENTS, VH, VW } from "./constants";

export interface Pin {
  row: Page;
  x: number;
  y: number;
  lat: number;
  lng: number;
  color: string;
}

export function MapSvg({
  pins, hover, onHover, onOpenRow,
}: {
  pins: Pin[];
  hover: string | null;
  onHover: (id: string | null) => void;
  onOpenRow: (id: string) => void;
}) {
  const hovered = hover ? pins.find((x) => x.row.id === hover) : null;
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-accent/30">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto block" role="img" aria-label="World map">
        <rect width={VW} height={VH} fill="var(--muted)" />
        {Array.from({ length: 13 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={(i / 12) * VW} y1={0}
            x2={(i / 12) * VW} y2={VH}
            stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 4"
          />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={0} y1={(i / 6) * VH}
            x2={VW} y2={(i / 6) * VH}
            stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 4"
          />
        ))}
        <line x1={0} y1={VH / 2} x2={VW} y2={VH / 2} stroke="var(--border)" strokeWidth={1} />
        {CONTINENTS.map((d, i) => (
          <path key={i} d={d} fill="var(--card)" stroke="var(--border)" strokeWidth={1} />
        ))}
        {pins.map(({ row, x, y, color }) => {
          const isHover = hover === row.id;
          return (
            <g
              key={row.id}
              transform={`translate(${x},${y})`}
              className="cursor-pointer"
              onMouseEnter={() => onHover(row.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onOpenRow(row.id)}
            >
              <circle r={isHover ? 7 : 5} fill={color} stroke="white" strokeWidth={1.5} className="transition-all" />
              <circle r={isHover ? 14 : 10} fill={color} opacity={0.2} />
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div className="px-3 py-2 border-t border-border bg-card text-xs flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-brand" />
          <span className="font-medium">
            <DynamicIcon value={hovered.row.icon} className="text-sm mr-1 inline-flex" />
            {hovered.row.title || "Untitled"}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {hovered.lat.toFixed(3)}, {hovered.lng.toFixed(3)}
          </span>
        </div>
      )}
    </div>
  );
}
