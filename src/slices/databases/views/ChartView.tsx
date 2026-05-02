import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ChartAggregate, ChartKind, Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { BarChart3, LineChart as LineIcon, AreaChart as AreaIcon, PieChart as PieIcon, Donut, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

const PALETTE = ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#ec4899", "#eab308", "#06b6d4", "#ef4444", "#84cc16", "#6366f1"];

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
  if (prop.type === "checkbox") return raw ? "Checked" : "Unchecked";
  if (prop.type === "date") return (raw as any)?.date ?? "—";
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
      ?? db.properties[0],
    [db.properties, view.chartXProp],
  );
  const yProp = useMemo(
    () => db.properties.find(p => p.id === view.chartYProp && p.type === "number"),
    [db.properties, view.chartYProp],
  );

  const data = useMemo(() => {
    if (!xProp) return [] as { name: string; value: number; key: string }[];
    const buckets = new Map<string, { values: number[]; label: string }>();
    for (const r of rows) {
      const raw = r.rowProps?.[xProp.id];
      const key = raw === undefined || raw === null || raw === "" ? "__empty__" : String(raw);
      const num = yProp ? Number(r.rowProps?.[yProp.id] ?? 0) || 0 : 1;
      const b = buckets.get(key) ?? { values: [], label: labelFor(xProp, raw) };
      b.values.push(num);
      buckets.set(key, b);
    }
    return [...buckets.entries()].map(([key, { values, label }]) => ({
      key, name: label, value: aggregate(values, agg),
    }));
  }, [rows, xProp, yProp, agg]);

  const numProps = db.properties.filter(p => p.type === "number");
  const xCandidates = db.properties.filter(p =>
    p.type === "select" || p.type === "status" || p.type === "checkbox" || p.type === "person"
  );

  const renderChart = () => {
    if (!xProp) return <Empty msg="Pick a category property" />;
    if (!data.length) return <Empty msg="No data yet" />;

    if (kind === "pie" || kind === "donut") {
      const inner = kind === "donut" ? 56 : 0;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} innerRadius={inner} label>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }
    const Wrapper = kind === "line" ? LineChart : kind === "area" ? AreaChart : BarChart;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <Wrapper data={data} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          {kind === "bar" && <Bar dataKey="value" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />}
          {kind === "line" && <Line type="monotone" dataKey="value" stroke={PALETTE[0]} strokeWidth={2} dot />}
          {kind === "area" && <Area type="monotone" dataKey="value" stroke={PALETTE[0]} fill={PALETTE[0]} fillOpacity={0.25} />}
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
      <div className="h-[360px] rounded-lg border border-border bg-card p-2">
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
