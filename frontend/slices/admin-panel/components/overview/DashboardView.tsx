import {
  Users, Briefcase, FileText, Database, Image as ImageIcon, MessageSquare, Bell,
  Activity, Share2, Trash2, Layers, Rows3, TrendingUp, Crown,
} from "lucide-react";
import { StatCard } from "./StatCard";
import { Sparkline, DualBars, RoleDistribution } from "./charts";
import type { OverviewData, RoleCounts, TopUser } from "./types";

export function OverviewDashboardView({
  overview,
  signupTrend,
  activityTrend,
  topUsers,
  roleDist,
}: {
  overview: OverviewData;
  signupTrend: { date: string; count: number }[];
  activityTrend: { date: string; created: number; edited: number }[];
  topUsers: TopUser[];
  roleDist: RoleCounts | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-2">Workspace at a glance</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Users" value={overview.users} icon={Users} tone="brand" hint={`${overview.admins} admin${overview.admins === 1 ? "" : "s"}`} />
          <StatCard label="Workspaces" value={overview.workspaces} icon={Briefcase} />
          <StatCard label="Pages" value={overview.pages} icon={FileText} hint={`${overview.pagesShared} shared`} />
          <StatCard label="Pages in trash" value={overview.pagesInTrash} icon={Trash2} tone="warn" />
          <StatCard label="Databases" value={overview.databases} icon={Database} />
          <StatCard label="Database rows" value={overview.rows} icon={Rows3} />
          <StatCard label="Blocks" value={overview.blocks} icon={Layers} />
          <StatCard label="Files" value={overview.files} icon={ImageIcon} />
          <StatCard label="Comments" value={overview.comments} icon={MessageSquare} />
          <StatCard label="Notifications" value={overview.notifications} icon={Bell} />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Active users</h4>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="DAU · 24h" value={overview.dau ?? 0} icon={Activity} tone="brand" />
          <StatCard label="WAU · 7d" value={overview.wau ?? 0} icon={Activity} tone="brand" />
          <StatCard label="MAU · 30d" value={overview.mau ?? 0} icon={Activity} tone="brand" />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Signups + edit windows</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="New users · 24h" value={overview.newUsers24h} icon={TrendingUp} tone="good" />
          <StatCard label="New users · 7d" value={overview.newUsers7d} icon={TrendingUp} tone="good" />
          <StatCard label="New users · 30d" value={overview.newUsers30d} icon={TrendingUp} tone="good" />
          <StatCard label="Pages edited · 24h" value={overview.editedPages24h} icon={Activity} tone="brand" />
          <StatCard label="Pages edited · 7d" value={overview.editedPages7d} icon={Activity} tone="brand" />
          <StatCard label="Public pages" value={overview.pagesShared} icon={Share2} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Signups · 30 days</div>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="h-40">
            {signupTrend.length > 0 ? (
              <Sparkline data={signupTrend} />
            ) : (
              <div className="grid place-items-center h-full text-xs text-muted-foreground">No data yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Page activity · 30 days</div>
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="h-40">
            {activityTrend.length > 0 ? (
              <DualBars data={activityTrend} />
            ) : (
              <div className="grid place-items-center h-full text-xs text-muted-foreground">No data yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Crown className="h-4 w-4 text-amber-500" /> Role distribution
          </div>
          {roleDist ? <RoleDistribution counts={roleDist} /> : <div className="text-xs text-muted-foreground">Loading…</div>}
        </div>
        <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-brand" /> Top contributors
          </div>
          {topUsers.length === 0 ? (
            <div className="text-xs text-muted-foreground">No content yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {topUsers.map((u) => (
                <li key={String(u._id)} className="flex items-center gap-3 py-2">
                  <div className="grid place-items-center h-7 w-7 shrink-0 rounded-full bg-muted text-xs font-medium uppercase">
                    {(u.name ?? u.email ?? "?").slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{u.name ?? u.email ?? "Unknown"}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email ?? ""}</div>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    <div>{u.pageCount} <span className="text-muted-foreground">pages</span></div>
                    <div>{u.dbCount} <span className="text-muted-foreground">db</span></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
