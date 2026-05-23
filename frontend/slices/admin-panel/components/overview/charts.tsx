import type { RoleCounts } from "./types";

export function Sparkline({ data, color = "brand" }: { data: { date: string; count: number }[]; color?: "brand" | "good" }) {
  if (data.length === 0) return null;
  const w = 600;
  const h = 160;
  const pad = 12;
  const max = Math.max(1, ...data.map((d) => d.count));
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => ({
    x: pad + i * stepX,
    y: h - pad - (d.count / max) * (h - pad * 2),
    date: d.date,
    count: d.count,
  }));
  const polyPoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath =
    `M ${pad},${h - pad} ` +
    pts.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    ` L ${w - pad},${h - pad} Z`;
  const labelEvery = Math.max(1, Math.ceil(pts.length / 7));
  const stroke = color === "good" ? "hsl(142 70% 45%)" : "hsl(var(--brand, 24 90% 56%))";
  const id = color === "good" ? "spark-fill-good" : "spark-fill-brand";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <polyline points={polyPoints} fill="none" stroke={stroke} strokeWidth={2} />
      {pts.map((p, i) => (
        <g key={p.date}>
          <circle cx={p.x} cy={p.y} r={2.5} fill={stroke} />
          {i % labelEvery === 0 && (
            <text x={p.x} y={h - 2} fontSize={9} textAnchor="middle" fill="hsl(var(--muted-foreground))">
              {p.date.slice(5)}
            </text>
          )}
        </g>
      ))}
      <text x={pad} y={pad + 8} fontSize={10} fill="hsl(var(--muted-foreground))">max {max}</text>
    </svg>
  );
}

export function DualBars({ data }: { data: { date: string; created: number; edited: number }[] }) {
  if (data.length === 0) return null;
  const w = 600;
  const h = 160;
  const pad = 14;
  const max = Math.max(1, ...data.map((d) => Math.max(d.created, d.edited)));
  const slot = (w - pad * 2) / data.length;
  const barW = Math.max(2, (slot - 4) / 2);
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const x0 = pad + i * slot + 2;
        const ch = (d.created / max) * (h - pad * 2);
        const eh = (d.edited / max) * (h - pad * 2);
        return (
          <g key={d.date}>
            <rect x={x0} y={h - pad - ch} width={barW} height={ch} fill="hsl(var(--brand, 24 90% 56%))" rx={1} />
            <rect x={x0 + barW + 2} y={h - pad - eh} width={barW} height={eh} fill="hsl(142 70% 45%)" rx={1} opacity={0.85} />
            {i % labelEvery === 0 && (
              <text x={x0 + barW} y={h - 2} fontSize={9} textAnchor="middle" fill="hsl(var(--muted-foreground))">
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
      <g transform={`translate(${w - 130}, 8)`}>
        <rect x={0} y={2} width={8} height={8} fill="hsl(var(--brand, 24 90% 56%))" rx={1} />
        <text x={12} y={10} fontSize={10} fill="hsl(var(--muted-foreground))">created</text>
        <rect x={62} y={2} width={8} height={8} fill="hsl(142 70% 45%)" rx={1} />
        <text x={74} y={10} fontSize={10} fill="hsl(var(--muted-foreground))">edited</text>
      </g>
    </svg>
  );
}

export function RoleDistribution({ counts }: { counts: RoleCounts }) {
  const total = counts.superadmin + counts.admin + counts.user;
  if (total === 0) return <div className="text-xs text-muted-foreground">No users.</div>;
  const pctSuper = (counts.superadmin / total) * 100;
  const pctAdmin = (counts.admin / total) * 100;
  const pctUser = (counts.user / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded bg-muted">
        <div className="bg-warning" style={{ width: `${pctSuper}%` }} />
        <div className="bg-brand" style={{ width: `${pctAdmin}%` }} />
        <div className="bg-muted-foreground/40" style={{ width: `${pctUser}%` }} />
      </div>
      <div className="grid grid-cols-3 text-xs">
        <div><span className="inline-block h-2 w-2 rounded-sm bg-warning mr-1.5" />{counts.superadmin} owner</div>
        <div><span className="inline-block h-2 w-2 rounded-sm bg-brand mr-1.5" />{counts.admin} admin</div>
        <div><span className="inline-block h-2 w-2 rounded-sm bg-muted-foreground/40 mr-1.5" />{counts.user} user</div>
      </div>
    </div>
  );
}
