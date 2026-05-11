import { useMemo } from "react";
import { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { Hash, ListChecks, TrendingUp, Calendar as CalIcon, Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { colorClass, formatDate } from "@/shared/lib/format";
import { getVisibleProps } from "../lib/visibility";
import { DynamicIcon } from "@/shared/components/icon-picker";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function DashboardView({ db, view, rows, onOpenRow }: Props) {
  const visible = useMemo(() => getVisibleProps(db, view), [db, view]);
  const allNum = useMemo(() => visible.filter(p => p.type === "number"), [visible]);
  const allGroup = useMemo(() => visible.filter(p => p.type === "select" || p.type === "status"), [visible]);
  const allCheckbox = useMemo(() => visible.filter(p => p.type === "checkbox"), [visible]);

  const kpiIds = view.dashboardKPIs;
  const breakdownIds = view.dashboardBreakdowns;
  const recentLimit = view.dashboardRecentLimit ?? 5;

  const numProps = kpiIds?.length
    ? allNum.filter(p => kpiIds.includes(p.id))
    : allNum.slice(0, 2);
  const checkboxProps = kpiIds?.length
    ? allCheckbox.filter(p => kpiIds.includes(p.id))
    : allCheckbox.slice(0, 1);
  const groupProps = breakdownIds?.length
    ? allGroup.filter(p => breakdownIds.includes(p.id))
    : allGroup.slice(0, 4);

  const total = rows.length;
  const recent = useMemo(() => {
    const sorted = [...rows].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    return sorted.slice(0, recentLimit);
  }, [rows, recentLimit]);

  return (
    <div className="p-3 space-y-3">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Total rows" value={total} icon={Hash} accent="brand" />
        {checkboxProps.map(p => {
          const done = rows.filter(r => r.rowProps?.[p.id] === true).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return <Stat key={p.id} label={`${p.name} done`} value={`${done}/${total}`} sub={`${pct}%`} icon={ListChecks} accent="emerald" />;
        })}
        {numProps.map(p => {
          const vals = rows.map(r => num(r.rowProps?.[p.id]));
          const sum = vals.reduce((a, b) => a + b, 0);
          const avg = total ? sum / total : 0;
          return (
            <Stat
              key={p.id}
              label={p.name}
              value={fmt(sum)}
              sub={`avg ${fmt(avg)}`}
              icon={TrendingUp}
              accent="blue"
            />
          );
        })}
        {numProps.length === 0 && checkboxProps.length === 0 && (
          <Stat label="Properties" value={db.properties.length} icon={Hash} accent="purple" />
        )}
      </div>

      {/* Group breakdowns */}
      {groupProps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {groupProps.map(p => (
            <GroupBreakdown key={p.id} prop={p} rows={rows} />
          ))}
        </div>
      )}

      {/* Recent activity */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <CalIcon className="h-3.5 w-3.5" /> Recent updates
          </div>
          <span className="text-[10px] text-muted-foreground">{recent.length} of {total}</span>
        </div>
        <div className="divide-y divide-border">
          {recent.length === 0 && <div className="py-4 text-center text-xs text-muted-foreground">No rows yet</div>}
          {recent.map(r => (
            <button
              key={r.id}
              onClick={() => onOpenRow(r.id)}
              className="flex w-full items-center justify-between gap-2 py-1.5 text-left hover:bg-accent/50 px-1 rounded"
            >
              <span className="flex items-center gap-1.5 min-w-0 text-sm">
                <DynamicIcon value={r.icon} className="text-sm" />
                <span className="truncate">{r.title || "Untitled"}</span>
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDate(r.updatedAt ?? Date.now())}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupBreakdown({ prop, rows }: { prop: Property; rows: Page[] }) {
  const counts = new Map<string, number>();
  let unset = 0;
  for (const r of rows) {
    const v = r.rowProps?.[prop.id];
    if (!v) { unset += 1; continue; }
    const key = String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const max = Math.max(1, ...counts.values(), unset);
  const opts = prop.options ?? [];
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> {prop.name}
      </div>
      <div className="space-y-1.5">
        {opts.map(o => {
          const c = counts.get(o.id) ?? 0;
          return (
            <div key={o.id} className="flex items-center gap-2 text-xs">
              <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] shrink-0 w-28 truncate", colorClass(o.color))}>{o.name}</span>
              <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                <div className="h-full bg-brand" style={{ width: `${(c / max) * 100}%` }} />
              </div>
              <span className="w-6 text-right text-muted-foreground">{c}</span>
            </div>
          );
        })}
        {unset > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-[10px] shrink-0 w-28 truncate text-muted-foreground">No {prop.name}</span>
            <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-muted-foreground/40" style={{ width: `${(unset / max) * 100}%` }} />
            </div>
            <span className="w-6 text-right text-muted-foreground">{unset}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, accent }: {
  label: string; value: number | string; sub?: string; icon: any;
  accent: "brand" | "emerald" | "blue" | "purple";
}) {
  const tones = {
    brand: "text-brand bg-brand/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    blue: "text-blue-600 bg-blue-500/10",
    purple: "text-purple-600 bg-purple-500/10",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md", tones[accent])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
