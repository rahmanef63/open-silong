"use client";

// Admin · Traffic — cookieless visitor analytics from the self-hosted beacon:
// page views + referrers + geo (country/city via geoip). Two windows (7d/30d)
// off one query. Reuses the overview slice's StatCard + Sparkline primitives +
// the local HBarList. Admin-gated by ClientAdmin + requireAdminQuery server-side.
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Eye, Users, Globe } from "lucide-react";
import { StatCard } from "./overview/StatCard";
import { Sparkline } from "./overview/charts";
import { HBarList } from "./traffic/HBarList";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const MONTH = 30 * 24 * 60 * 60 * 1000;

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function TrafficPanel() {
  const d7 = useQuery(api.features.traffic.queries.summary, { sinceMs: WEEK });
  const d30 = useQuery(api.features.traffic.queries.summary, { sinceMs: MONTH });

  if (d7 === undefined || d30 === undefined) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Traffic</h3>
        <p className="text-xs text-muted-foreground">
          Cookieless, self-hosted beacon — page views + referrer + geo (city via geoip). No cookie,
          no stored IP.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Views · 7d" value={d7.total} icon={Eye} tone="brand" />
        <StatCard label="Unique · 7d" value={d7.uniqueSessions} icon={Users} tone="good" />
        <StatCard label="Views · 30d" value={d30.total} icon={Eye} />
        <StatCard label="Top country" value={d30.topCountries[0]?.key ?? "—"} icon={Globe} />
      </div>

      <Panel title="Volume · 30d" sub={`${d30.total.toLocaleString()} views`}>
        {d30.perDay.length ? (
          <div className="h-40 w-full">
            <Sparkline data={d30.perDay.map((p) => ({ date: p.day, count: p.count }))} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No data yet.</p>
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Top paths · 7d">
          <HBarList items={d7.topPaths.map((p) => ({ label: p.key, value: p.count }))} unit="×" />
        </Panel>
        <Panel title="Top referrers · 7d">
          <HBarList items={d7.topReferrers.map((p) => ({ label: p.key, value: p.count }))} />
        </Panel>
        <Panel title="Top countries · 30d">
          <HBarList items={d30.topCountries.map((p) => ({ label: p.key, value: p.count }))} />
        </Panel>
        <Panel title="Top cities · 30d">
          <HBarList items={d30.topCities.map((p) => ({ label: p.key, value: p.count }))} />
        </Panel>
      </div>

      {(d7.capped || d30.capped) && (
        <p className="text-xs text-muted-foreground">
          Hard cap of 10,000 rows reached — figures under-count. Add daily aggregation if traffic
          grows.
        </p>
      )}
    </div>
  );
}
