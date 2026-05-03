"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
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
        <div className="h-56">
          {trend && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--brand, 220 90% 56%))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid place-items-center h-full text-xs text-muted-foreground">No data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
