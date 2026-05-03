"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Sparkline({ data }: { data: { date: string; count: number }[] }) {
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
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand, 24 90% 56%))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--brand, 24 90% 56%))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-fill)" />
      <polyline points={polyPoints} fill="none" stroke="hsl(var(--brand, 24 90% 56%))" strokeWidth={2} />
      {pts.map((p, i) => (
        <g key={p.date}>
          <circle cx={p.x} cy={p.y} r={2.5} fill="hsl(var(--brand, 24 90% 56%))" />
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

export function OverviewPanel() {
  const overview = useQuery(api.admin.queries.getOverview);
  const trend = useQuery(api.admin.queries.getSignupTrend, { days: 14 });

  if (overview === undefined) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }
  if (overview === null) {
    return <div className="text-sm text-destructive">Tidak berwenang.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Users" value={overview.users} hint={`${overview.admins} admin${overview.admins === 1 ? "" : "s"}`} />
        <StatCard label="Workspaces" value={overview.workspaces} />
        <StatCard label="Pages" value={overview.pages} hint={`${overview.pagesInTrash} in trash`} />
        <StatCard label="Databases" value={overview.databases} />
        <StatCard label="Files" value={overview.files} />
        <StatCard label="Comments" value={overview.comments} />
        <StatCard label="Notifications" value={overview.notifications} />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 text-sm font-medium">Signups · last 14 days</div>
        <div className="h-40">
          {trend && trend.length > 0 ? (
            <Sparkline data={trend} />
          ) : (
            <div className="grid place-items-center h-full text-xs text-muted-foreground">No data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
