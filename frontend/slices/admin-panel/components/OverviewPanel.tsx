"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { RefreshCw } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { ViewSwitcher, type AdminView } from "./ViewSwitcher";
import { useAdminView } from "../hooks/useAdminView";
import { buildKpis } from "./overview/buildKpis";
import { OverviewTableView } from "./overview/TableView";
import { OverviewDashboardView } from "./overview/DashboardView";

const AVAILABLE_VIEWS: AdminView[] = ["table", "dashboard"];

type Overview = FunctionReturnType<typeof api.admin.queries.getOverview>;

export function OverviewPanel() {
  const convex = useConvex();
  // getOverview runs ~8 full-table scans and is admin-only — it does not
  // need to stay live. Fetch it ONCE on mount (undefined = loading, null =
  // unauthorized, mirroring the old useQuery states) plus a manual Refresh
  // so the scans run per page-open instead of on every write to any of the
  // eight scanned tables.
  const [overview, setOverview] = useState<Overview | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(() => {
    setRefreshing(true);
    convex
      .query(api.admin.queries.getOverview, {})
      .then((res) => setOverview(res))
      .catch(() => setOverview(null))
      .finally(() => setRefreshing(false));
  }, [convex]);
  useEffect(() => {
    load();
  }, [load]);

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
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={load}
              disabled={refreshing}
              className="h-7 gap-1.5 px-2 text-xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
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
