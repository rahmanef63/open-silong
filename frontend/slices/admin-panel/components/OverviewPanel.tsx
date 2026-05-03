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
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.count / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const area = `M ${pad},${h - pad} L ${points.replaceAll(",", " ").replaceAll("  ", " L ")} L ${w - pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand, 24 90% 56%))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--brand, 24 90% 56%))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <polyline points={points} fill="none" stroke="hsl(var(--brand, 24 90% 56%))" strokeWidth={2} />
      {data.map((d, i) => {
        const x = pad + i * stepX;
        const y = h - pad - (d.count / max) * (h - pad * 2);
        return (
          <g key={d.date}>
            <circle cx={x} cy={y} r={2.5} fill="hsl(var(--brand, 24 90% 56%))" />
            {i % Math.ceil(data.length / 7) === 0 && (
              <text x={x} y={h - 2} fontSize={9} textAnchor="middle" fill="hsl(var(--muted-foreground))">
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
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
