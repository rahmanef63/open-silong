import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, Label,
} from "recharts";
import { ChartAggregate, ChartKind, Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { BarChart3, LineChart as LineIcon, AreaChart as AreaIcon, PieChart as PieIcon, Donut, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

const PALETTES: Record<string, string[]> = {
  warm: ["#f97316", "#ef4444", "#eab308", "#f43f5e", "#ec4899", "#dc2626", "#fb923c", "#facc15"],
  cool: ["#3b82f6", "#06b6d4", "#10b981", "#6366f1", "#0ea5e9", "#14b8a6", "#22d3ee", "#3aa6ff"],
  rainbow: ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#ec4899", "#eab308", "#06b6d4", "#ef4444", "#84cc16", "#6366f1"],
  mono: ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9"],
};

const KIND_META: Record<ChartKind, { icon: any; label: string }> = {
  bar: { icon: BarChart3, label: "Bar" },
  line: { icon: LineIcon, label: "Line" },
  area: { icon: AreaIcon, label: "Area" },
  pie: { icon: PieIcon, label: "Pie" },
  donut: { icon: Donut, label: "Donut" },
};

const AGG_LABEL: Record<ChartAggregate, string> = {
  count: "Count", sum: "Sum", avg: "Average", min: "Min", max: "Max",
};

function labelFor(prop: Property | undefined, raw: any): string {
  if (raw === undefined || raw === null || raw === "") return "—";
  if (!prop) return String(raw);
  if (prop.type === "select" || prop.type === "status") {
    const opt = prop.options?.find(o => o.id === raw);
    return opt?.name ?? "—";
  }
  if (prop.type === "multi_select") {
    const ids = Array.isArray(raw) ? raw : [];
    if (ids.length === 0) return "—";
    return ids.map(id => prop.options?.find(o => o.id === id)?.name ?? "—").join(", ");
  }
  if (prop.type === "checkbox") return raw ? "Checked" : "Unchecked";
  if (prop.type === "date") return (raw as any)?.date ?? "—";
  if (prop.type === "number") return Number.isFinite(raw) ? String(raw) : "—";
  if (Array.isArray(raw)) return raw.length ? raw.join(", ") : "—";
  return String(raw);
}

function aggregate(values: number[], agg: ChartAggregate): number {
  if (!values.length) return 0;
  switch (agg) {
    case "count": return values.length;
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "avg": return values.reduce((a, b) => a + b, 0) / values.length;
    case "min": return Math.min(...values);
    case "max": return Math.max(...values);
  }
}

export function ChartView({ db, view, rows }: Props) {
  const { updateView } = useStore();
  const kind: ChartKind = view.chartKind ?? "bar";
  const agg: ChartAggregate = view.chartAggregate ?? "count";

  const xProp = useMemo(
    () => db.properties.find(p => p.id === view.chartXProp)
      ?? db.properties.find(p => p.type === "select" || p.type === "status")
      ?? db.properties.find(p => p.type !== "number")
      ?? db.properties[0],
    [db.properties, view.chartXProp],
  );
  const yProp = useMemo(
    () => db.properties.find(p => p.id === view.chartYProp && p.type === "number"),
    [db.properties, view.chartYProp],
  );

  const palette = PALETTES[view.chartPalette ?? "warm"] ?? PALETTES.warm;
  const decimals = Math.max(0, Math.min(4, view.chartDecimals ?? 0));
  const showGrid = view.chartShowGrid ?? true;
  const showLegend = view.chartShowLegend ?? true;
  const showValues = view.chartShowValues ?? false;
  const sortBy = view.chartSortBy ?? "value";
  const sortDir = view.chartSortDir ?? "desc";
  const topN = view.chartTopN ?? 0;
  const xLabel = view.chartXLabel?.trim() || xProp?.name || "";
  const yLabel = view.chartYLabel?.trim() || (agg === "count" ? "Count" : (yProp?.name ?? "Value"));
  const chartTitle = view.chartTitle?.trim();
  const heightPx = view.chartHeight === "small" ? 240 : view.chartHeight === "large" ? 520 : 360;

  const data = useMemo(() => {
    if (!xProp) return [] as { name: string; value: number; key: string }[];
    const buckets = new Map<string, { values: number[]; label: string }>();
    const keyFor = (raw: any): string => {
      if (raw === undefined || raw === null || raw === "") return "__empty__";
      if (xProp.type === "date") return (raw as any)?.date ?? "__empty__";
      if (Array.isArray(raw)) return raw.length ? [...raw].sort().join("|") : "__empty__";
      if (typeof raw === "object") return JSON.stringify(raw);
      return String(raw);
    };
    for (const r of rows) {
      const raw = r.rowProps?.[xProp.id];
      const key = keyFor(raw);
      const num = yProp ? Number(r.rowProps?.[yProp.id] ?? 0) || 0 : 1;
      const b = buckets.get(key) ?? { values: [], label: labelFor(xProp, raw) };
      b.values.push(num);
      buckets.set(key, b);
    }
    let arr = [...buckets.entries()].map(([key, { values, label }]) => ({
      key, name: label, value: Number(aggregate(values, agg).toFixed(decimals)),
    }));
    arr.sort((a, b) => {
      if (sortBy === "name") {
        const c = a.name.localeCompare(b.name);
        return sortDir === "asc" ? c : -c;
      }
      const c = a.value - b.value;
      return sortDir === "asc" ? c : -c;
    });
    if (topN > 0 && arr.length > topN) {
      const top = arr.slice(0, topN);
      const rest = arr.slice(topN);
      const restValue = aggregate(rest.map(r => r.value), "sum");
      top.push({ key: "__other__", name: `Other (${rest.length})`, value: Number(restValue.toFixed(decimals)) });
      arr = top;
    }
    return arr;
  }, [rows, xProp, yProp, agg, decimals, sortBy, sortDir, topN]);

  const numProps = db.properties.filter(p => p.type === "number");
  const xCandidates = db.properties; // any column is valid as a category

  const renderChart = () => {
    if (!xProp) return <Empty msg="Pick a category property" />;
    if (!data.length) return <Empty msg="No data yet" />;

    if (kind === "pie" || kind === "donut") {
      const inner = kind === "donut" ? 56 : 0;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip />
            {showLegend && <Legend />}
            <Pie data={data} dataKey="value" nameKey="name" outerRadius="75%" innerRadius={inner} label={showValues}>
              {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }
    const Wrapper = kind === "line" ? LineChart : kind === "area" ? AreaChart : BarChart;
    const bottomMargin = xLabel ? 28 : 12;
    const leftMargin = yLabel ? 18 : 0;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <Wrapper data={data} margin={{ top: 12, right: 12, left: leftMargin, bottom: bottomMargin }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={data.length > 8 ? -25 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 60 : 30}>
            {xLabel && <Label value={xLabel} position="insideBottom" offset={-12} className="fill-muted-foreground" style={{ fontSize: 11 }} />}
          </XAxis>
          <YAxis tick={{ fontSize: 11 }} allowDecimals={decimals > 0}>
            {yLabel && <Label value={yLabel} position="insideLeft" angle={-90} className="fill-muted-foreground" style={{ fontSize: 11, textAnchor: "middle" }} />}
          </YAxis>
          <Tooltip />
          {showLegend && <Legend />}
          {kind === "bar" && (
            <Bar dataKey="value" fill={palette[0]} radius={[4, 4, 0, 0]}>
              {showValues && <LabelList dataKey="value" position="top" style={{ fontSize: 10 }} />}
            </Bar>
          )}
          {kind === "line" && (
            <Line type="monotone" dataKey="value" stroke={palette[0]} strokeWidth={2} dot>
              {showValues && <LabelList dataKey="value" position="top" style={{ fontSize: 10 }} />}
            </Line>
          )}
          {kind === "area" && (
            <Area type="monotone" dataKey="value" stroke={palette[0]} fill={palette[0]} fillOpacity={0.25}>
              {showValues && <LabelList dataKey="value" position="top" style={{ fontSize: 10 }} />}
            </Area>
          )}
        </Wrapper>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Picker
          label="Chart"
          icon={KIND_META[kind].icon}
          value={KIND_META[kind].label}
          items={(Object.keys(KIND_META) as ChartKind[]).map(k => ({
            id: k, label: KIND_META[k].label, icon: KIND_META[k].icon,
            onClick: () => updateView(db.id, view.id, { chartKind: k }),
          }))}
        />
        <Picker
          label="X axis"
          value={xProp?.name ?? "—"}
          items={xCandidates.length ? xCandidates.map(p => ({
            id: p.id, label: p.name, onClick: () => updateView(db.id, view.id, { chartXProp: p.id }),
          })) : [{ id: "_", label: "Add a select/status property", onClick: () => {} }]}
        />
        <Picker
          label="Aggregate"
          value={AGG_LABEL[agg]}
          items={(Object.keys(AGG_LABEL) as ChartAggregate[]).map(a => ({
            id: a, label: AGG_LABEL[a], onClick: () => updateView(db.id, view.id, { chartAggregate: a }),
          }))}
        />
        {agg !== "count" && (
          <Picker
            label="Y value"
            value={yProp?.name ?? "—"}
            items={numProps.length ? numProps.map(p => ({
              id: p.id, label: p.name, onClick: () => updateView(db.id, view.id, { chartYProp: p.id }),
            })) : [{ id: "_", label: "Add a number property", onClick: () => {} }]}
          />
        )}
      </div>
      {chartTitle && (
        <h3 className="text-sm font-semibold text-foreground">{chartTitle}</h3>
      )}
      <div className="rounded-lg border border-border bg-card p-2" style={{ height: heightPx }}>
        {renderChart()}
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{msg}</div>
  );
}

function Picker({ label, icon: Icon, value, items }: {
  label: string; icon?: any; value: string;
  items: { id: string; label: string; icon?: any; onClick: () => void }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 hover:bg-accent",
        )}>
          <span className="text-muted-foreground">{label}:</span>
          {Icon && <Icon className="h-3 w-3" />}
          <span className="font-medium">{value}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map(it => (
          <DropdownMenuItem key={it.id} onClick={it.onClick}>
            {it.icon && <it.icon className="mr-2 h-3.5 w-3.5" />}
            {it.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
