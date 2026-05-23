"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ViewSwitcher, type AdminView } from "./ViewSwitcher";
import { useAdminView } from "../hooks/useAdminView";
import { buildKpis } from "./overview/buildKpis";
import { OverviewTableView } from "./overview/TableView";
import { OverviewDashboardView } from "./overview/DashboardView";

const AVAILABLE_VIEWS: AdminView[] = ["table", "dashboard"];

export function OverviewPanel() {
  const overview = useQuery(api.admin.queries.getOverview);
  const [view, setView] = useAdminView("overview", AVAILABLE_VIEWS);
  // Trend/role/topUsers queries fire only when the dashboard view is
  // active. Table view never reads them — wasted Convex round-trips +
  // websocket subscriptions until this gate. Convex's "skip" sentinel
  // is the idiomatic way to defer a useQuery without unmounting.
  const dashboardArgs = view === "dashboard";
  const signupTrend = useQuery(api.admin.queries.getSignupTrend, dashboardArgs ? { days: 30 } : "skip");
  const activityTrend = useQuery(api.admin.queries.getActivityTrend, dashboardArgs ? { days: 30 } : "skip");
  const topUsers = useQuery(api.admin.queries.getTopUsersByContent, dashboardArgs ? { limit: 8 } : "skip");
  const roleDist = useQuery(api.admin.queries.getRoleDistribution, dashboardArgs ? {} : "skip");

  const kpis = useMemo(() => (overview ? buildKpis(overview) : []), [overview]);

  if (overview === undefined) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }
  if (overview === null) {
    return <div className="text-sm text-destructive">Tidak berwenang.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/60">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Overview</h3>
          <span className="text-xs text-muted-foreground">{kpis.length} metrics</span>
          <div className="ml-auto">
            <ViewSwitcher value={view} onChange={setView} available={AVAILABLE_VIEWS} />
          </div>
        </div>
      </div>

      {view === "table" && <OverviewTableView kpis={kpis} />}
      {view === "dashboard" && (
        <OverviewDashboardView
          overview={overview}
          signupTrend={signupTrend ?? []}
          activityTrend={activityTrend ?? []}
          topUsers={topUsers ?? []}
          roleDist={roleDist ?? null}
        />
      )}
    </div>
  );
}
