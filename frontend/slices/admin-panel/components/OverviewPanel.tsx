"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Users, Briefcase, FileText, Database, Image as ImageIcon, MessageSquare, Bell,
  Activity, Share2, Trash2, Layers, Rows3, TrendingUp, Crown,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { ViewSwitcher, type AdminView } from "./ViewSwitcher";
import { useAdminView } from "../hooks/useAdminView";

const AVAILABLE_VIEWS: AdminView[] = ["table", "dashboard"];

type Tone = "default" | "brand" | "warn" | "good";

interface KPI {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof Users;
  tone: Tone;
  section: string;
}

export function OverviewPanel() {
  const overview = useQuery(api.admin.queries.getOverview);
  const signupTrend = useQuery(api.admin.queries.getSignupTrend, { days: 30 });
  const activityTrend = useQuery(api.admin.queries.getActivityTrend, { days: 30 });
  const topUsers = useQuery(api.admin.queries.getTopUsersByContent, { limit: 8 });
  const roleDist = useQuery(api.admin.queries.getRoleDistribution);
  const [view, setView] = useAdminView("overview", AVAILABLE_VIEWS);

  const kpis: KPI[] = useMemo(() => {
    if (!overview) return [];
    return [
      { label: "Users", value: overview.users, hint: `${overview.admins} admin${overview.admins === 1 ? "" : "s"}`, icon: Users, tone: "brand", section: "Workspace" },
      { label: "Workspaces", value: overview.workspaces, icon: Briefcase, tone: "default", section: "Workspace" },
      { label: "Pages", value: overview.pages, hint: `${overview.pagesShared} shared`, icon: FileText, tone: "default", section: "Workspace" },
      { label: "Pages in trash", value: overview.pagesInTrash, icon: Trash2, tone: "warn", section: "Workspace" },
      { label: "Databases", value: overview.databases, icon: Database, tone: "default", section: "Workspace" },
      { label: "Database rows", value: overview.rows, icon: Rows3, tone: "default", section: "Workspace" },
      { label: "Blocks", value: overview.blocks, icon: Layers, tone: "default", section: "Workspace" },
      { label: "Files", value: overview.files, icon: ImageIcon, tone: "default", section: "Workspace" },
      { label: "Comments", value: overview.comments, icon: MessageSquare, tone: "default", section: "Workspace" },
      { label: "Notifications", value: overview.notifications, icon: Bell, tone: "default", section: "Workspace" },

      { label: "DAU · 24h", value: overview.dau ?? 0, icon: Activity, tone: "brand", section: "Active users" },
      { label: "WAU · 7d", value: overview.wau ?? 0, icon: Activity, tone: "brand", section: "Active users" },
      { label: "MAU · 30d", value: overview.mau ?? 0, icon: Activity, tone: "brand", section: "Active users" },

      { label: "New users · 24h", value: overview.newUsers24h, icon: TrendingUp, tone: "good", section: "Growth windows" },
      { label: "New users · 7d", value: overview.newUsers7d, icon: TrendingUp, tone: "good", section: "Growth windows" },
      { label: "New users · 30d", value: overview.newUsers30d, icon: TrendingUp, tone: "good", section: "Growth windows" },
      { label: "Pages edited · 24h", value: overview.editedPages24h, icon: Activity, tone: "brand", section: "Growth windows" },
      { label: "Pages edited · 7d", value: overview.editedPages7d, icon: Activity, tone: "brand", section: "Growth windows" },
      { label: "Public pages", value: overview.pagesShared, icon: Share2, tone: "default", section: "Growth windows" },
    ];
  }, [overview]);

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

      {view === "table" && <TableView kpis={kpis} />}

      {view === "dashboard" && (
        <DashboardView
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

function TableView({ kpis }: { kpis: KPI[] }) {
  const sections = useMemo(() => {
    const map = new Map<string, KPI[]>();
    for (const k of kpis) {
      const arr = map.get(k.section) ?? [];
      arr.push(k);
      map.set(k.section, arr);
    }
    return [...map.entries()];
  }, [kpis]);

  return (
    <div className="space-y-5">
      {sections.map(([section, rows]) => (
        <section key={section} className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">{section}</h4>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="hidden md:table-cell">Hint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((k) => {
                  const Icon = k.icon;
                  const toneCls =
                    k.tone === "brand"
                      ? "text-brand"
                      : k.tone === "warn"
                        ? "text-amber-600 dark:text-amber-400"
                        : k.tone === "good"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground";
                  return (
                    <TableRow key={k.label}>
                      <TableCell><Icon className={`h-3.5 w-3.5 ${toneCls}`} /></TableCell>
                      <TableCell className="font-medium">{k.label}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {typeof k.value === "number" ? k.value.toLocaleString() : k.value}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{k.hint ?? ""}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------- Dashboard view (original rich charts) ---------- */

function DashboardView({
  overview,
  signupTrend,
  activityTrend,
  topUsers,
  roleDist,
}: {
  overview: {
    users: number; admins: number; workspaces: number; pages: number; pagesInTrash: number;
    pagesShared: number; databases: number; rows: number; blocks: number; files: number;
    comments: number; notifications: number; newUsers24h: number; newUsers7d: number; newUsers30d: number;
    editedPages24h: number; editedPages7d: number; dau?: number; wau?: number; mau?: number;
  };
  signupTrend: { date: string; count: number }[];
  activityTrend: { date: string; created: number; edited: number }[];
  topUsers: { _id: unknown; name: string | null; email: string | null; pageCount: number; dbCount: number }[];
  roleDist: { superadmin: number; admin: number; user: number } | null;
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

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof Users;
  tone?: Tone;
}) {
  const toneCls =
    tone === "brand"
      ? "bg-brand/10 text-brand"
      : tone === "warn"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : tone === "good"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`grid place-items-center h-7 w-7 rounded-md ${toneCls}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Sparkline({ data, color = "brand" }: { data: { date: string; count: number }[]; color?: "brand" | "good" }) {
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

function DualBars({ data }: { data: { date: string; created: number; edited: number }[] }) {
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

function RoleDistribution({ counts }: { counts: { superadmin: number; admin: number; user: number } }) {
  const total = counts.superadmin + counts.admin + counts.user;
  if (total === 0) return <div className="text-xs text-muted-foreground">No users.</div>;
  const pctSuper = (counts.superadmin / total) * 100;
  const pctAdmin = (counts.admin / total) * 100;
  const pctUser = (counts.user / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded bg-muted">
        <div className="bg-amber-500" style={{ width: `${pctSuper}%` }} />
        <div className="bg-brand" style={{ width: `${pctAdmin}%` }} />
        <div className="bg-muted-foreground/40" style={{ width: `${pctUser}%` }} />
      </div>
      <div className="grid grid-cols-3 text-xs">
        <div><span className="inline-block h-2 w-2 rounded-sm bg-amber-500 mr-1.5" />{counts.superadmin} owner</div>
        <div><span className="inline-block h-2 w-2 rounded-sm bg-brand mr-1.5" />{counts.admin} admin</div>
        <div><span className="inline-block h-2 w-2 rounded-sm bg-muted-foreground/40 mr-1.5" />{counts.user} user</div>
      </div>
    </div>
  );
}
